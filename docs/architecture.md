# Application Architecture

## Overview

The application uses a hybrid PDF-processing architecture.

- Small and simple operations may run in the browser
- Larger and more expensive operations run in cloud workers
- The API manages users, uploads, jobs, usage, and authorization
- Files are stored separately from application servers

## High-Level Architecture

```text
User Browser
    |
    |-- Next.js application
    |       |
    |       |-- PDF previews with PDF.js
    |       |-- Local PDF operations with pdf-lib
    |       |
    |       `-- API requests
    |
    `------> Node.js API
                |
                |-- Authentication and authorization
                |-- Upload session creation
                |-- Job creation
                |-- Usage and plan enforcement
                |-- Signed download generation
                |
                |-- PostgreSQL
                |-- Object storage
                `-- Job queue
                         |
                         `--> PDF processing worker
                                  |
                                  |-- qpdf
                                  |-- pdf-lib
                                  `-- Future processors
```

## Recommended Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Zustand
- React Dropzone
- PDF.js
- pdf-lib

### Backend API

- Node.js
- TypeScript
- Fastify or NestJS
- Zod
- Prisma
- PostgreSQL

### Worker

- Node.js
- TypeScript
- Docker
- qpdf
- pdf-lib
- Native processing utilities as required

### Infrastructure

- AWS CDK with TypeScript
- Docker
- GitHub Actions
- AWS-managed services

## Monorepo Structure

```text
pdf-saas/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── database/
│   ├── shared/
│   ├── pdf-engine/
│   ├── ui/
│   └── config/
├── infrastructure/
│   └── cdk/
├── docs/
├── docker/
└── package.json
```

## Major Components

## Web Application

Responsibilities:

- File selection
- Upload progress
- Page thumbnails
- Drag-and-drop organization
- Operation settings
- Job submission
- Job-status polling
- Downloads
- Authentication screens
- Account and billing screens

The web application must not be trusted to enforce plan limits or file ownership.

## API Service

Responsibilities:

- Authenticate users
- Authorize access to files and jobs
- Create upload sessions
- Generate signed upload URLs
- Confirm uploads
- Create jobs
- Validate operation options
- Enforce usage limits
- Publish queue messages
- Return job status
- Generate signed download URLs
- Handle billing webhooks
- Record immutable usage events

The API should not receive full PDF files unless a future feature specifically requires it.

## PDF Processing Worker

Responsibilities:

1. Receive a job identifier
2. Load job metadata
3. Confirm the job can be processed
4. Download input files
5. Validate the local copies
6. Run the requested operation
7. Validate the output
8. Upload the result
9. Update job status
10. Record usage
11. Delete temporary files

Workers should be stateless.

## PDF Engine Abstraction

Application logic should not depend directly on one PDF library.

```ts
export interface PdfProcessor {
  merge(
    inputPaths: string[],
    outputPath: string,
  ): Promise<ProcessingResult>;

  split(
    inputPath: string,
    options: SplitOptions,
    outputDirectory: string,
  ): Promise<ProcessingResult[]>;

  organize(
    inputPath: string,
    operations: PageOperation[],
    outputPath: string,
  ): Promise<ProcessingResult>;
}
```

Possible implementations:

- `BrowserPdfLibProcessor`
- `NodePdfLibProcessor`
- `QpdfProcessor`
- `CommercialPdfProcessor`

## Local Processing

Local processing is appropriate when:

- Files are small
- The operation is supported reliably in the browser
- The operation does not require native tools
- Memory usage is acceptable
- The user prefers not to upload files

Potential local operations:

- Merge small PDFs
- Reorder pages
- Rotate pages
- Delete pages
- Extract pages

The server may still be used for authentication and usage accounting.

## Cloud Processing

Cloud processing is appropriate when:

- Files are large
- Multiple files are processed
- The operation is CPU-intensive
- Native binaries are required
- Processing may take more than a few seconds
- The browser may not have enough memory
- Reliable retries are required

## Upload Flow

```text
1. Browser requests an upload session
2. API validates the plan and file metadata
3. API creates a file record
4. API returns a short-lived signed upload URL
5. Browser uploads directly to object storage
6. Browser confirms upload completion
7. Backend validates and scans the object
8. File becomes available for a processing job
```

## Job Flow

```text
1. User selects an operation
2. Browser submits input file IDs and options
3. API verifies ownership and plan limits
4. API creates a job record
5. API publishes the job ID to the queue
6. Worker claims the message
7. Worker marks the job as processing
8. Worker processes the inputs
9. Worker uploads the output
10. Worker marks the job as completed
11. User downloads the result using a signed URL
```

## Job Idempotency

Each job must include an idempotency mechanism.

Recommended controls:

- Unique idempotency key for job creation
- Conditional status updates
- One immutable usage event per billable job
- Output keys derived from job IDs
- Safe retries when an output already exists

## Progress Updates

For the MVP, use polling:

```text
GET /v1/jobs/{jobId}
```

Suggested interval:

- Every 2 seconds while queued or processing
- Stop when completed, failed, cancelled, or expired

WebSockets or server-sent events may be added later.

## Error Handling

Use stable error codes.

Examples:

- `INVALID_PDF`
- `ENCRYPTED_PDF`
- `FILE_TOO_LARGE`
- `PAGE_LIMIT_EXCEEDED`
- `UPLOAD_EXPIRED`
- `INPUT_NOT_FOUND`
- `UNSUPPORTED_OPERATION`
- `PROCESSING_TIMEOUT`
- `PROCESSING_FAILED`
- `OUTPUT_VALIDATION_FAILED`
- `USAGE_LIMIT_EXCEEDED`

The UI should map error codes to helpful messages.

## API Outline

```text
POST   /v1/uploads
POST   /v1/uploads/{id}/complete
DELETE /v1/uploads/{id}

POST   /v1/jobs
GET    /v1/jobs
GET    /v1/jobs/{id}
POST   /v1/jobs/{id}/cancel
GET    /v1/jobs/{id}/download

GET    /v1/account/usage
GET    /v1/account/subscription

POST   /v1/billing/checkout
POST   /v1/billing/portal
POST   /v1/webhooks/billing
```

## Deployment Environments

Use separate environments:

- Local
- Development
- Staging
- Production

Each environment should have separate:

- Storage buckets or prefixes
- Queues
- Databases
- Secrets
- Application configuration
- Monitoring dashboards

Production data must never be copied casually into development.
