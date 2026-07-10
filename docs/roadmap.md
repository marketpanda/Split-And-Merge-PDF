# Product Roadmap

## Roadmap Principles

- Complete one reliable end-to-end workflow before adding many tools
- Prioritize security and cleanup early
- Measure infrastructure cost before finalizing pricing
- Keep the first release focused on page-level operations
- Separate product milestones from exact calendar commitments

## Phase 0 — Discovery and Validation

### Goals

- Confirm target users
- Review competitors
- Test PDF libraries
- Validate technical feasibility
- Define MVP limits

### Tasks

- [ ] Write product vision
- [ ] Define MVP scope
- [ ] Identify primary user persona
- [ ] Review general PDF competitors
- [ ] Review construction-document opportunities
- [ ] Test PDF.js page rendering
- [ ] Test pdf-lib merge and page manipulation
- [ ] Test qpdf in Docker
- [ ] Test malformed and encrypted PDFs
- [ ] Measure memory use with large PDFs
- [ ] Review processing-library licenses
- [ ] Estimate AWS cost per sample job

### Exit Criteria

- One local proof of concept works
- One Docker processing proof of concept works
- Initial scope and architecture are documented

## Phase 1 — Project Foundation

### Goals

Create the codebase and deployment foundation.

### Deliverables

- [ ] Create monorepo
- [ ] Configure TypeScript
- [ ] Configure linting and formatting
- [ ] Create Next.js application
- [ ] Create API application
- [ ] Create worker application
- [ ] Create shared packages
- [ ] Configure PostgreSQL and Prisma
- [ ] Add local Docker environment
- [ ] Create AWS CDK project
- [ ] Create development environment
- [ ] Configure GitHub Actions
- [ ] Configure automated tests
- [ ] Add structured logging

### Exit Criteria

- Web, API, and worker build successfully
- Pull requests run automated checks
- Development infrastructure can be deployed

## Phase 2 — Upload and File Management

### Goals

Allow secure direct uploads and metadata management.

### Deliverables

- [ ] Create file database model
- [ ] Create upload-session model
- [ ] Generate signed upload URLs
- [ ] Upload directly from browser to S3
- [ ] Display upload progress
- [ ] Confirm upload completion
- [ ] Validate PDF signature
- [ ] Detect encrypted PDFs
- [ ] Add file-size limits
- [ ] Add page-count limits
- [ ] Add automatic expiration timestamps
- [ ] Add delete-file endpoint
- [ ] Configure S3 lifecycle policies

### Exit Criteria

- User can upload a valid PDF
- Invalid files are rejected
- Uploaded objects are private
- Expired test objects are cleaned up

## Phase 3 — Browser PDF Organizer

### Goals

Deliver the first useful PDF tool.

### Deliverables

- [ ] Render PDF thumbnails with PDF.js
- [ ] Add drag-and-drop page ordering
- [ ] Add page rotation
- [ ] Add page deletion
- [ ] Add page duplication
- [ ] Add page extraction
- [ ] Generate output with pdf-lib
- [ ] Download local output
- [ ] Handle browser memory errors
- [ ] Add responsive layout
- [ ] Add accessibility labels

### Exit Criteria

A user can upload one PDF, reorder pages, rotate or remove pages, and download the result.

## Phase 4 — Cloud Processing Pipeline

### Goals

Process large and multi-file jobs asynchronously.

### Deliverables

- [ ] Create job database model
- [ ] Add job creation API
- [ ] Add SQS queue
- [ ] Add dead-letter queue
- [ ] Build worker Docker image
- [ ] Publish image to ECR
- [ ] Deploy worker to ECS Fargate
- [ ] Add qpdf integration
- [ ] Add job-status polling
- [ ] Add retries
- [ ] Add idempotency
- [ ] Add processing timeouts
- [ ] Upload output to S3
- [ ] Generate signed downloads
- [ ] Clean worker temporary files

### Exit Criteria

A large merge job can be queued, processed, downloaded, and retried safely.

## Phase 5 — Core MVP Tools

### Goals

Complete the initial toolset.

### Deliverables

- [ ] Merge PDFs
- [ ] Split every page
- [ ] Split by page ranges
- [ ] Extract selected pages
- [ ] Reorder pages
- [ ] Rotate pages
- [ ] Delete pages
- [ ] Rename output
- [ ] Improve error messages
- [ ] Add downloadable ZIP for multiple outputs

### Exit Criteria

All MVP operations work for supported PDFs with automated tests.

## Phase 6 — Authentication and Dashboard

### Goals

Support registered users and job history.

### Deliverables

- [ ] Configure Cognito
- [ ] Add sign-up
- [ ] Add sign-in
- [ ] Add password reset
- [ ] Add email verification
- [ ] Add organization model
- [ ] Add user dashboard
- [ ] Show recent jobs
- [ ] Show job status
- [ ] Show expiration date
- [ ] Add manual file deletion
- [ ] Add account deletion workflow

### Exit Criteria

A registered user can securely view and manage only their own files and jobs.

## Phase 7 — Security Hardening

### Goals

Prepare for external users.

### Deliverables

- [ ] Add malware scanning
- [ ] Add rate limiting
- [ ] Add AWS WAF
- [ ] Restrict worker outbound traffic
- [ ] Run worker as non-root
- [ ] Add container scanning
- [ ] Add dependency scanning
- [ ] Add cross-tenant security tests
- [ ] Add signed-URL leakage tests
- [ ] Review application logs
- [ ] Add security alarms
- [ ] Add cleanup verification
- [ ] Write incident-response procedure
- [ ] Write privacy policy
- [ ] Write terms of service

### Exit Criteria

Security checklist passes and private beta documents are ready.

## Phase 8 — Usage and Billing

### Goals

Introduce sustainable limits and paid access.

### Deliverables

- [ ] Add plan configuration
- [ ] Add usage events
- [ ] Add daily job limits
- [ ] Add monthly credits
- [ ] Integrate billing provider
- [ ] Add checkout
- [ ] Add billing portal
- [ ] Verify billing webhooks
- [ ] Add upgrade prompts
- [ ] Add subscription status handling
- [ ] Add cancellation handling
- [ ] Add payment-failure handling

### Exit Criteria

A user can subscribe, receive plan limits, and cancel safely.

## Phase 9 — Private Beta

### Goals

Test with real users.

### Activities

- [ ] Recruit 10–30 testers
- [ ] Observe first-time use
- [ ] Collect failed files with user consent
- [ ] Track completion rate
- [ ] Track processing cost
- [ ] Track common errors
- [ ] Measure free-user resource consumption
- [ ] Interview active users
- [ ] Prioritize usability fixes
- [ ] Improve onboarding
- [ ] Improve support documentation

### Exit Criteria

- Stable processing success rate
- No critical security issues
- File cleanup verified
- Cost model understood
- Clear launch priorities

## Phase 10 — Public MVP Launch

### Goals

Release the service publicly.

### Deliverables

- [ ] Finalize product name
- [ ] Purchase domain
- [ ] Create landing page
- [ ] Add product analytics
- [ ] Add status page
- [ ] Add support email
- [ ] Publish privacy policy
- [ ] Publish terms
- [ ] Configure production alerts
- [ ] Configure AWS budget alerts
- [ ] Add backup and restore documentation
- [ ] Complete launch checklist

## Post-MVP Roadmap

### Version 1.1

- [ ] Add watermarks
- [ ] Add page numbers
- [ ] Add compression
- [ ] Add password protection
- [ ] Add image-to-PDF
- [ ] Add PDF-to-image
- [ ] Add batch processing

### Version 1.2

- [ ] Add OCR
- [ ] Create searchable scanned PDFs
- [ ] Extract text
- [ ] Extract tables
- [ ] Add document classification

### Version 2

- [ ] Add developer API
- [ ] Add API keys
- [ ] Add webhooks
- [ ] Add team workspaces
- [ ] Add audit logs
- [ ] Add Google Drive integration
- [ ] Add Dropbox integration
- [ ] Add saved workflows

### Specialized Construction Product

- [ ] Merge drawing packages
- [ ] Extract selected plan sheets
- [ ] Add drawing numbers
- [ ] Add project watermarks
- [ ] Add revision stamps
- [ ] Generate transmittal packages
- [ ] Compare drawing revisions
- [ ] Extract title-block metadata

## Initial GitHub Project Columns

```text
Ideas
Backlog
Ready
In Progress
Testing
Done
```

## Suggested GitHub Issue Labels

```text
type:feature
type:bug
type:research
type:security
type:infrastructure
area:frontend
area:api
area:worker
area:aws
area:database
priority:high
priority:medium
priority:low
phase:mvp
phase:post-mvp
```

## First Suggested Issues

1. Test PDF.js rendering with a 100-page document
2. Test pdf-lib merge with multiple files
3. Create qpdf Docker proof of concept
4. Create Next.js project
5. Create Node.js API project
6. Create worker service
7. Create Prisma schema
8. Create S3 upload flow
9. Create first merge job
10. Add output download flow
