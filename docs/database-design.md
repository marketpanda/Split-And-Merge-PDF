# Database Design

## Database

Use PostgreSQL with Prisma.

The database stores metadata and business state.

PDF file contents must remain in object storage, not in PostgreSQL.

## Design Principles

- Use generated UUIDs or sortable unique identifiers
- Store timestamps in UTC
- Use immutable usage events for billing
- Enforce tenant ownership at the API layer
- Use database constraints where possible
- Avoid storing signed URLs
- Avoid storing sensitive document content
- Use soft deletion only when legally or operationally necessary

## Core Entities

## User

Represents an authenticated account.

```text
users
-----
id
cognito_user_id
email
display_name
status
created_at
updated_at
last_login_at
```

Suggested `status` values:

- `ACTIVE`
- `SUSPENDED`
- `DELETED`

## Organization

Supports personal and future team accounts.

```text
organizations
-------------
id
name
slug
owner_user_id
plan
created_at
updated_at
```

A personal account may still have one organization behind the scenes.

## Organization Member

```text
organization_members
--------------------
organization_id
user_id
role
created_at
```

Suggested roles:

- `OWNER`
- `ADMIN`
- `MEMBER`

## File

Stores metadata for an uploaded or generated object.

```text
files
-----
id
organization_id
uploaded_by_user_id
kind
original_filename
storage_bucket
storage_key
mime_type
size_bytes
page_count
sha256
status
scan_status
encryption_status
expires_at
created_at
updated_at
deleted_at
```

Suggested `kind` values:

- `INPUT`
- `OUTPUT`
- `THUMBNAIL`
- `ARCHIVE`

Suggested `status` values:

- `PENDING_UPLOAD`
- `UPLOADED`
- `VALIDATING`
- `READY`
- `REJECTED`
- `EXPIRED`
- `DELETED`

Suggested `scan_status` values:

- `NOT_STARTED`
- `SCANNING`
- `CLEAN`
- `INFECTED`
- `FAILED`

Suggested `encryption_status` values:

- `UNKNOWN`
- `NOT_ENCRYPTED`
- `PASSWORD_PROTECTED`

Indexes:

- `organization_id`
- `uploaded_by_user_id`
- `status`
- `expires_at`
- `created_at`

## Upload Session

Tracks direct-to-storage uploads.

```text
upload_sessions
---------------
id
organization_id
user_id
file_id
status
expected_size_bytes
expected_mime_type
expires_at
completed_at
created_at
```

Suggested statuses:

- `CREATED`
- `UPLOADING`
- `COMPLETED`
- `EXPIRED`
- `CANCELLED`

## Job

Represents one PDF operation.

```text
jobs
----
id
organization_id
user_id
operation
status
progress_percent
options_json
idempotency_key
error_code
error_message
attempt_count
queued_at
started_at
completed_at
expires_at
created_at
updated_at
```

Suggested operations:

- `MERGE_PDF`
- `SPLIT_PDF`
- `ORGANIZE_PDF`
- `ROTATE_PDF`
- `EXTRACT_PAGES`
- `COMPRESS_PDF`
- `ADD_WATERMARK`
- `ADD_PAGE_NUMBERS`

Suggested statuses:

- `CREATED`
- `SCANNING`
- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `EXPIRED`

Constraints:

- Unique `(organization_id, idempotency_key)` when present
- Progress between 0 and 100
- `completed_at` required for terminal states where appropriate

Indexes:

- `(organization_id, created_at)`
- `(status, queued_at)`
- `expires_at`
- `user_id`

## Job Input

Stores input order.

```text
job_inputs
----------
job_id
file_id
position
page_selection_json
created_at
```

Primary key:

```text
(job_id, file_id, position)
```

`position` is important for merging files.

## Job Output

```text
job_outputs
-----------
job_id
file_id
output_type
position
created_at
```

Suggested output types:

- `PRIMARY`
- `SPLIT_PART`
- `ARCHIVE`
- `PREVIEW`

## Usage Event

Immutable record used for limits, reporting, and billing.

```text
usage_events
------------
id
organization_id
user_id
job_id
event_type
operation
input_file_count
input_bytes
output_bytes
pages_processed
credits_used
created_at
```

Suggested event types:

- `JOB_COMPLETED`
- `JOB_REFUNDED`
- `MANUAL_ADJUSTMENT`

A unique constraint should prevent duplicate completion events for one job.

## Subscription

```text
subscriptions
-------------
id
organization_id
provider
provider_customer_id
provider_subscription_id
plan
status
current_period_start
current_period_end
cancel_at_period_end
created_at
updated_at
```

Suggested statuses:

- `TRIALING`
- `ACTIVE`
- `PAST_DUE`
- `CANCELLED`
- `INCOMPLETE`

## Plan Limit

Plan limits may initially be application configuration.

If stored in the database:

```text
plan_limits
-----------
plan
max_file_size_bytes
max_files_per_job
max_pages_per_job
daily_job_limit
monthly_credit_limit
retention_hours
priority
created_at
updated_at
```

Avoid allowing clients to submit plan values.

## Audit Event

Records security-sensitive activity.

```text
audit_events
------------
id
organization_id
user_id
event_type
target_type
target_id
metadata_json
ip_hash
user_agent
created_at
```

Examples:

- File deleted
- Job created
- Download generated
- Subscription changed
- User suspended
- Organization member added

Do not put document contents in audit metadata.

## Suggested Prisma Models

```prisma
enum JobStatus {
  CREATED
  SCANNING
  QUEUED
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  EXPIRED
}

enum JobOperation {
  MERGE_PDF
  SPLIT_PDF
  ORGANIZE_PDF
  ROTATE_PDF
  EXTRACT_PAGES
  COMPRESS_PDF
  ADD_WATERMARK
  ADD_PAGE_NUMBERS
}

model Job {
  id             String       @id @default(uuid())
  organizationId String
  userId         String
  operation      JobOperation
  status         JobStatus    @default(CREATED)
  progress       Int          @default(0)
  options        Json
  idempotencyKey String?
  errorCode      String?
  errorMessage   String?
  attemptCount   Int          @default(0)
  queuedAt       DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  expiresAt      DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  inputs         JobInput[]
  outputs        JobOutput[]
  usageEvents    UsageEvent[]

  @@unique([organizationId, idempotencyKey])
  @@index([organizationId, createdAt])
  @@index([status, queuedAt])
  @@index([expiresAt])
}
```

## Data Retention

### Temporary File Metadata

File records may be retained after object deletion for:

- Billing
- Abuse prevention
- Operational reporting
- Error investigation

Stored metadata should be minimized.

### User Deletion

A deletion workflow should:

1. Revoke active sessions
2. Cancel active jobs
3. Delete temporary objects
4. Remove or anonymize personal data
5. Retain only legally required billing records
6. Record completion of deletion

## Migration Strategy

Use Prisma migrations.

Rules:

- Never edit an already-applied production migration
- Test migrations against staging
- Back up before destructive changes
- Use expand-and-contract migrations for zero-downtime changes
- Run migrations separately from application startup in production
