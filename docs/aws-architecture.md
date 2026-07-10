# AWS Architecture

## Objective

Use managed AWS services to provide secure file storage, asynchronous PDF processing, observability, and scalable deployment without managing traditional servers.

## Recommended AWS Services

| Requirement | AWS Service |
|---|---|
| DNS | Route 53 |
| TLS certificates | AWS Certificate Manager |
| CDN and edge protection | CloudFront |
| Web hosting | S3 or Amplify Hosting |
| API runtime | Lambda or ECS Fargate |
| Authentication | Cognito |
| File storage | S3 |
| Queue | SQS |
| PDF workers | ECS Fargate |
| Container registry | ECR |
| Database | RDS PostgreSQL |
| Database connection management | RDS Proxy, when needed |
| Workflow orchestration | Step Functions, later |
| Secrets | Secrets Manager |
| Encryption keys | KMS |
| Monitoring | CloudWatch |
| Audit trail | CloudTrail |
| Email | SES |
| Web application firewall | AWS WAF |
| Malware scanning | GuardDuty Malware Protection for S3 |
| Infrastructure as code | AWS CDK |

## High-Level AWS Flow

```text
User
  |
  v
Route 53
  |
  v
CloudFront + WAF
  |
  +--> Next.js web application
  |
  `--> API Gateway / Application Load Balancer
            |
            v
        API runtime
            |
            +--> Cognito
            +--> RDS PostgreSQL
            +--> S3 signed upload URLs
            `--> SQS processing queue
                     |
                     v
               ECS Fargate worker
                     |
                     +--> Download inputs from S3
                     +--> Process PDF
                     +--> Upload output to S3
                     `--> Update database
```

## Recommended Runtime Split

### Control Plane

Use Lambda or a small ECS API service for:

- Upload-session creation
- Signed URL generation
- Job creation
- Job-status retrieval
- Download authorization
- Billing webhooks
- Account management

### Processing Plane

Use ECS Fargate for:

- Native PDF binaries
- Large files
- CPU-intensive operations
- Long-running jobs
- Predictable container environments
- Larger temporary storage needs

## S3 Design

Use separate buckets for different trust levels.

```text
pdf-saas-{environment}-uploads
pdf-saas-{environment}-processed
pdf-saas-{environment}-logs
```

Alternative: use one bucket with strict prefixes, but separate buckets provide clearer permissions.

Suggested keys:

```text
uploads/{tenantId}/{fileId}/source.pdf
processed/{tenantId}/{jobId}/output.pdf
processed/{tenantId}/{jobId}/manifest.json
```

Do not use the original filename as the storage key.

### S3 Controls

- Block all public access
- Enable server-side encryption
- Require TLS
- Restrict access using IAM roles
- Use short-lived signed URLs
- Configure lifecycle expiration
- Disable public ACL usage
- Log access where appropriate
- Apply object tags for retention and scan status

## Upload Flow on AWS

```text
1. Browser calls API
2. API creates file metadata
3. API returns a presigned S3 upload URL
4. Browser uploads directly to S3
5. S3 event starts validation or scanning
6. Scan status is recorded
7. File becomes eligible for processing
```

## Queue Design

Use an SQS standard queue.

```text
pdf-processing
pdf-processing-dead-letter
```

Message body:

```json
{
  "jobId": "job_123"
}
```

Do not include file contents or large configurations.

### Queue Controls

- Visibility timeout longer than expected job duration
- Dead-letter queue after repeated failures
- Long polling
- Idempotent consumers
- CloudWatch alarms for queue depth
- CloudWatch alarms for oldest message age

## ECS Fargate Worker

The worker container should include:

- Node.js runtime
- Application code
- qpdf
- Required native libraries
- Non-root user
- Restricted filesystem permissions

Suggested execution model:

- One job per task for strong isolation, or
- A small long-running worker service for lower startup cost

Start with a long-running service consuming SQS if traffic is steady.

Consider one-task-per-job when isolation matters more than startup cost.

## Networking

Recommended production setup:

- VPC across at least two Availability Zones
- Private subnets for ECS and RDS
- Public subnets only for load balancers where needed
- Security groups with least-privilege rules
- No public RDS access
- VPC endpoints for S3, ECR, CloudWatch, and Secrets Manager where cost-effective
- Controlled outbound access for workers

PDF workers should not have unrestricted outbound internet access unless required.

## RDS PostgreSQL

Use PostgreSQL for:

- Users and organizations
- File metadata
- Job metadata
- Usage events
- Subscription records
- Audit events

Initial production configuration:

- Private subnet
- Encryption enabled
- Automated backups
- Point-in-time recovery
- Multi-AZ when availability requirements justify it
- Performance Insights
- CloudWatch alarms

Start with a small instance and scale after observing actual load.

## Cognito

Use Cognito for:

- User registration
- Email verification
- Sign-in
- Password reset
- JWT issuance

Application authorization still belongs in the API.

Cognito authentication does not replace ownership checks for files and jobs.

## KMS and Secrets

Use KMS for:

- S3 encryption keys when customer-managed keys are required
- Secrets encryption
- Sensitive application configuration

Use Secrets Manager for:

- Database credentials
- Billing provider secrets
- Email credentials if applicable
- Third-party API keys

Never store long-lived production secrets in GitHub.

## Monitoring

### CloudWatch Metrics

Track:

- API error rate
- API latency
- Upload failures
- Queue depth
- Oldest queued message
- Worker failures
- Job duration
- Failed jobs by operation
- ECS CPU and memory
- RDS CPU and connections
- Storage consumption
- File-cleanup failures

### Logs

Use structured JSON logs with:

- Request ID
- User or tenant ID
- Job ID
- File ID
- Operation
- Error code

Do not log document contents or signed URLs.

## Alerts

Initial alarms:

- API 5xx rate
- Dead-letter queue message count
- Queue age above threshold
- Failed-job percentage above threshold
- Worker task failures
- RDS storage low
- Cleanup job failures
- Unusual S3 access-denied events

## CI/CD

Use GitHub Actions with AWS OIDC.

Suggested pipelines:

### Pull Request

- Install dependencies
- Lint
- Type-check
- Unit tests
- Build
- Container security scan

### Main Branch

- Run tests
- Build Docker images
- Push images to ECR
- Deploy CDK
- Run database migrations
- Deploy API and worker
- Run smoke tests

### Production

- Manual approval
- Deploy immutable artifact
- Run smoke tests
- Roll back on failure

Avoid permanent AWS access keys in GitHub secrets.

## Cost Controls

Add from the beginning:

- S3 lifecycle expiration
- File-size and page-count limits
- Per-plan job limits
- ECS CPU and memory limits
- Log-retention limits
- AWS Budgets alerts
- Cost-allocation tags
- Separate environments
- CloudFront caching
- Browser-side processing for simple jobs

Recommended tags:

```text
Application=pdf-saas
Environment=production
Component=worker
Owner=engineering
CostCenter=pdf-platform
```

## Disaster Recovery

Minimum controls:

- Automated RDS backups
- Infrastructure defined in CDK
- Versioned application artifacts
- Recoverable secrets
- Database restore procedure
- S3 retention aligned with privacy policy
- Documented production recovery steps

Uploaded user files are temporary and may not require backup. Database metadata and billing records do.
