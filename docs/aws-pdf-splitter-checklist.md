# AWS PDF Splitter Deployment Checklist

## Purpose

This document tracks the AWS work required for the initial workflow:

```text
Upload one multi-page PDF
  -> store the source in S3
  -> queue a Lambda job
  -> split every page
  -> store a ZIP in S3
  -> download the ZIP
```

## Required Creation Order

- [x] Create the DynamoDB jobs table
- [ ] Configure the private S3 bucket
- [ ] Configure SQS and its dead-letter queue
- [ ] Connect S3 object-created events to SQS
- [ ] Build and deploy the PDF-splitter Lambda
- [ ] Add Lambda IAM permissions
- [ ] Connect the SQS processing queue to Lambda
- [ ] Run an end-to-end test

## 1. DynamoDB Jobs Table

Status: **Complete**

Required configuration:

```text
Partition key: jobId (String)
TTL attribute: expiresAt
```

Application environment variable:

```text
AWS_JOBS_TABLE_NAME
```

## 2. Private S3 Bucket

Status: **In progress**

Application environment variable:

```text
AWS_S3_BUCKET_NAME
```

### Security

- [ ] Enable all four S3 Block Public Access settings
- [ ] Set Object Ownership to `Bucket owner enforced`
- [ ] Keep ACLs disabled
- [ ] Use default SSE-S3 encryption for the initial release
- [ ] Do not grant public read or write access through a bucket policy

Presigned upload and download URLs continue to work with public access blocked.

### Object Key Layout

The application and worker use these keys:

```text
inputs/{jobId}/source.pdf
outputs/{jobId}/pages.zip
```

S3 prefixes are not real folders and do not need to be created manually.

### Browser CORS

For local development:

```json
[
  {
    "AllowedHeaders": [
      "content-type"
    ],
    "AllowedMethods": [
      "PUT"
    ],
    "AllowedOrigins": [
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

Add the exact production origin when it is known. Do not add a path to an
origin and do not use `*` in production.

### Lifecycle Cleanup

Create a rule named `cleanup-pdf-inputs`:

```text
Prefix: inputs/
Expire current objects after: 1 day
Abort incomplete multipart uploads after: 1 day
Expire noncurrent versions after: 1 day (only if versioning is enabled)
```

Create a rule named `cleanup-pdf-outputs`:

```text
Prefix: outputs/
Expire current objects after: 1 day
Abort incomplete multipart uploads after: 1 day
Expire noncurrent versions after: 1 day (only if versioning is enabled)
```

S3 lifecycle expiration uses whole days. The DynamoDB job can expire after one
hour while its S3 objects remain eligible for cleanup after one day. Use a
scheduled cleanup Lambda later if strict one-hour object deletion is required.

## 3. SQS

Create two **Standard** queues in the same AWS Region as the S3 bucket and
Lambda function:

```text
pdf-processing
pdf-processing-dlq
```

Use Standard queues because S3 cannot send event notifications directly to an
SQS FIFO queue. Create the DLQ first so it can be selected while creating the
processing queue.

### 3.1 Create the dead-letter queue

In **Amazon SQS -> Queues -> Create queue**, enter:

```text
Type: Standard
Name: pdf-processing-dlq
Message retention period: 14 days
Encryption: Server-side encryption with SQS-managed keys (SSE-SQS)
```

The 14-day retention period gives operators time to inspect and redrive failed
jobs. The DLQ does not need a Lambda trigger.

After creating it, open **Redrive allow policy** and select **Only specified
queues**. Add `pdf-processing` after the processing queue has been created. This
prevents unrelated queues from using this DLQ.

### 3.2 Create the processing queue

In **Amazon SQS -> Queues -> Create queue**, enter:

```text
Type: Standard
Name: pdf-processing
Visibility timeout: 6 minutes (360 seconds)
Message retention period: 1 day
Delivery delay: 0 seconds
Receive message wait time: 20 seconds
Encryption: Server-side encryption with SQS-managed keys (SSE-SQS)
Dead-letter queue: pdf-processing-dlq
Maximum receives: 3
```

The visibility timeout starts when Lambda receives a message. While it is
running, that message is hidden from other consumers. If processing fails, the
message becomes available after the visibility timeout and Lambda can try it
again. After three unsuccessful receives, SQS moves it to the DLQ.

`360 seconds` satisfies the hard requirement that the visibility timeout be
longer than the `180-second` Lambda timeout. AWS recommends a larger safety
margin of six times the Lambda timeout, which would be `1,080 seconds` (18
minutes). Start with 360 seconds for the MVP only if concurrency is low and
throttling is unlikely; use 1,080 seconds for the more conservative production
setting.

### 3.3 Allow S3 to send messages

Open the processing queue, choose **Access policy -> Edit**, and use the policy
below. Replace the four placeholder occurrences; do not grant this permission
on the DLQ. If the queue already has policy statements, preserve them and add
the new statement to its `Statement` array.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3PdfUploadNotifications",
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:AWS_REGION:AWS_ACCOUNT_ID:pdf-processing",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::AWS_S3_BUCKET_NAME"
        },
        "StringEquals": {
          "aws:SourceAccount": "AWS_ACCOUNT_ID"
        }
      }
    }
  ]
}
```

The bucket and queue must be in the same Region. This policy must be saved
before the S3 event notification in section 4 can be validated and created.

### 3.4 Verify the queues

- [ ] Both queues are Standard queues in the S3 bucket's Region
- [ ] Processing queue redrive policy targets `pdf-processing-dlq`
- [ ] Maximum receives is 3
- [ ] The DLQ redrive allow policy permits `pdf-processing`
- [ ] S3 alone can call `sqs:SendMessage` on the processing queue
- [ ] No consumer or Lambda trigger is attached to the DLQ

## 4. S3 Event Notification

This step depends on the `pdf-processing` queue and its S3 access policy from
section 3. Do not create the notification before those are ready.

In **Amazon S3 -> Buckets -> your bucket -> Properties -> Event
notifications**, create:

```text
Event:       ObjectCreated (all object creation events)
Prefix:      inputs/
Suffix:      /source.pdf
Destination: SQS queue
SQS queue:   pdf-processing
```

The `outputs/` prefix must not trigger processing. This prevents the Lambda's
ZIP output from creating a recursive processing loop. If S3 reports that it
cannot validate the destination, recheck the queue policy from section 3.3 and
confirm the bucket and queue are in the same Region.

## 5. PDF-Splitter Lambda

Handler source:

```text
workers/pdf-splitter/src/handler.ts
```

Required environment variables:

```text
AWS_S3_BUCKET_NAME
AWS_JOBS_TABLE_NAME
```

Optional environment variable:

```text
MAX_PDF_PAGE_COUNT
```

Suggested initial configuration:

```text
Runtime: Node.js 22
Memory: 2,048 MB
Timeout: 180 seconds
Ephemeral storage: 1,024 MB
Reserved concurrency: 5
Architecture: arm64 or x86_64, matching the deployment bundle
```

The worker writes its result to the deterministic key:

```text
outputs/{jobId}/pages.zip
```

## 6. Lambda IAM Permissions

This step depends on the Lambda function from section 5. Creating the function
also creates or selects its execution role; edit that role here before adding
the SQS trigger.

### 6.1 Open the execution role

In **Lambda -> Functions -> PDF-splitter function -> Configuration ->
Permissions**, find **Execution role** and select its role name. This opens the
role in IAM.

Do not edit the SQS queue access policy for this step. The queue access policy
allows S3 to publish; the Lambda execution role allows the worker to consume and
process messages.

### 6.2 Enable CloudWatch Logs

Under **Permissions policies**, confirm that the role has the AWS-managed
`AWSLambdaBasicExecutionRole` policy. Lambda normally adds it when the function
is created through the console.

If it is missing, choose **Add permissions -> Attach policies**, search for
`AWSLambdaBasicExecutionRole`, select it, and choose **Add permissions**. This
grants `logs:CreateLogGroup`, `logs:CreateLogStream`, and `logs:PutLogEvents`.

### 6.3 Add the worker resource policy

Choose **Add permissions -> Create inline policy -> JSON** and paste the policy
below. Replace every placeholder with the real resource value before saving:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadInputPdf",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::AWS_S3_BUCKET_NAME/inputs/*"
    },
    {
      "Sid": "WriteOutputArchive",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::AWS_S3_BUCKET_NAME/outputs/*"
    },
    {
      "Sid": "UpdatePdfJobs",
      "Effect": "Allow",
      "Action": "dynamodb:UpdateItem",
      "Resource": "arn:aws:dynamodb:AWS_REGION:AWS_ACCOUNT_ID:table/AWS_JOBS_TABLE_NAME"
    },
    {
      "Sid": "ConsumePdfProcessingQueue",
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:AWS_REGION:AWS_ACCOUNT_ID:pdf-processing"
    }
  ]
}
```

Use these substitutions:

```text
AWS_S3_BUCKET_NAME   -> the actual bucket name, without s3://
AWS_JOBS_TABLE_NAME  -> the actual DynamoDB table name
AWS_REGION           -> for example, ap-southeast-2
AWS_ACCOUNT_ID       -> the 12-digit AWS account ID
```

`AWS_S3_BUCKET_NAME` and `AWS_JOBS_TABLE_NAME` above are placeholders. IAM does
not substitute Lambda environment variables inside resource ARNs.

Choose **Next**, name the inline policy `PdfSplitterWorkerAccess`, and choose
**Create policy**.

This custom policy intentionally replaces the broader
`AWSLambdaSQSQueueExecutionRole` managed policy for SQS access. Do not attach
both unless another requirement needs the managed policy. The output uses the
AWS SDK multipart upload helper, so `s3:AbortMultipartUpload` lets it clean up a
failed ZIP upload.

### 6.4 Verify the role

The execution role should now show:

```text
AWSLambdaBasicExecutionRole   AWS managed policy
PdfSplitterWorkerAccess       Inline customer policy
```

Complete this checklist before adding the trigger in section 7:

- [ ] Read objects only under `inputs/*`
- [ ] Write and abort uploads only under `outputs/*`
- [ ] Update items only in the jobs table
- [ ] Consume messages only from `pdf-processing`
- [ ] Write Lambda logs to CloudWatch Logs

SSE-SQS needs no KMS permission. If the queue or S3 bucket is later changed to
a customer-managed KMS key, add the required KMS permissions separately and
update the key policy.

The Next.js server identity separately needs permission to:

- Create presigned uploads for `inputs/*`
- Create and read jobs in the DynamoDB jobs table
- Create presigned downloads for `outputs/*`

## 7. Connect SQS to Lambda

This step depends on all of the following being complete:

- The `pdf-processing` queue exists from section 3
- The PDF-splitter Lambda exists and has a 180-second timeout from section 5
- The Lambda execution role can consume from the queue from section 6

Only after those dependencies are ready, open the Lambda function and choose
**Add trigger -> SQS**:

```text
SQS queue: pdf-processing
Enable trigger: Yes
Batch size: 1
Batch window: 0 seconds
Report batch item failures: Yes
```

Leave event filtering, provisioned polling, and maximum concurrency unset for
the initial deployment. Function reserved concurrency is configured separately
in section 5.

`ReportBatchItemFailures` is an **event source mapping** setting, not an SQS
queue setting. The existing handler at
`workers/pdf-splitter/src/handler.ts` already implements the required response:

```json
{
  "batchItemFailures": [
    { "itemIdentifier": "failed-sqs-message-id" }
  ]
}
```

An empty `batchItemFailures` array tells Lambda to delete the successfully
processed message. Returning its message ID tells Lambda to leave that message
on the queue for retry. Batch size 1 keeps one PDF job per invocation; partial
batch reporting is still enabled so increasing the batch size later does not
cause successful jobs to be retried with a failed one.

### 7.1 Expected retry timeline

With a 180-second function timeout, 360-second visibility timeout, and maximum
receive count of 3, a consistently failing job behaves approximately as follows:

```text
t=0 minutes:  receive 1; Lambda processes the job
t=6 minutes:  receive 2 after the message becomes visible again
t=12 minutes: receive 3
after receive 3 fails: SQS moves the message to pdf-processing-dlq
```

Actual timing and the exact point at which SQS transfers the message can be
later because of Lambda throttling, polling, backoff, and approximate receive
counts. SQS and Lambda provide at-least-once delivery, so the worker must
tolerate a duplicate message even when the first invocation succeeds.

The requested MVP timing is:

```text
Lambda timeout: 180 seconds
SQS visibility timeout: 360 seconds
Maximum receives before DLQ: 3
```

AWS recommends a visibility timeout of six times the function timeout and a
`maxReceiveCount` of at least 5 for greater tolerance of throttling and transient
errors. The values above intentionally favor faster failure detection for this
initial low-volume deployment and should be revisited with production metrics.

### 7.2 Verify the event source mapping

The Lambda console should show an enabled SQS trigger with batch size 1. With
the AWS CLI configured for the deployment account, the exact settings can be
checked with:

```powershell
aws lambda list-event-source-mappings `
  --function-name PDF_SPLITTER_FUNCTION_NAME `
  --event-source-arn arn:aws:sqs:AWS_REGION:AWS_ACCOUNT_ID:pdf-processing `
  --query "EventSourceMappings[].{State:State,BatchSize:BatchSize,BatchWindow:MaximumBatchingWindowInSeconds,Responses:FunctionResponseTypes}"
```

Expected values:

```json
[
  {
    "State": "Enabled",
    "BatchSize": 1,
    "BatchWindow": 0,
    "Responses": ["ReportBatchItemFailures"]
  }
]
```

Also confirm the source queue's **Dead-letter queue** tab names
`pdf-processing-dlq` and shows maximum receives `3`.

### 7.3 Completion checklist

- [ ] Processing queue visibility timeout is longer than the Lambda timeout
- [ ] Lambda role can receive and delete messages from the processing queue
- [ ] Lambda event source mapping is enabled with batch size 1
- [ ] `ReportBatchItemFailures` is enabled on the event source mapping
- [ ] No Lambda trigger is attached to the DLQ

## 8. End-to-End Verification

After all resources are connected:

- [ ] Select a valid multi-page PDF in the application
- [ ] Confirm the source appears at `inputs/{jobId}/source.pdf`
- [ ] Confirm SQS receives the S3 event
- [ ] Confirm Lambda changes the job to `PROCESSING`
- [ ] Confirm the ZIP appears at `outputs/{jobId}/pages.zip`
- [ ] Confirm the job changes to `COMPLETED`
- [ ] Download and open the ZIP
- [ ] Confirm one PDF exists for every source page
- [ ] Test an invalid PDF
- [ ] Test an oversized PDF
- [ ] Confirm failed messages reach the dead-letter queue
