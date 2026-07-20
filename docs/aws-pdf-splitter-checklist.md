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

## Current Resume Point

- [x] Create the DynamoDB jobs table
- [ ] Configure the private S3 bucket **(current step)**
- [ ] Connect S3 object-created events to SQS
- [ ] Configure SQS and its dead-letter queue
- [ ] Build and deploy the PDF-splitter Lambda
- [ ] Add Lambda IAM permissions
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

## 3. S3 Event Notification

Create an S3 event notification with:

```text
Event:      ObjectCreated (all object creation events)
Prefix:     inputs/
Suffix:     /source.pdf
Destination: the PDF processing SQS queue
```

The `outputs/` prefix must not trigger processing. This prevents the Lambda's
ZIP output from creating a recursive processing loop.

## 4. SQS

Create a processing queue and a dead-letter queue.

Required processing queue settings:

```text
Lambda batch size: 1
Visibility timeout: longer than the Lambda timeout
Dead-letter queue: enabled
ReportBatchItemFailures: enabled on the Lambda event source mapping
```

Suggested initial timing:

```text
Lambda timeout: 180 seconds
SQS visibility timeout: 360 seconds
Maximum receives before DLQ: 3
```

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

Grant the Lambda execution role only the access it needs:

- [ ] Read objects under `inputs/*`
- [ ] Write objects under `outputs/*`
- [ ] Update items in the DynamoDB jobs table
- [ ] Consume messages from the processing SQS queue
- [ ] Write logs to CloudWatch Logs

The Next.js server identity separately needs permission to:

- Create presigned uploads for `inputs/*`
- Create and read jobs in the DynamoDB jobs table
- Create presigned downloads for `outputs/*`

## 7. End-to-End Verification

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
