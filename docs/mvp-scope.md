# MVP Scope

## Objective

Deliver a usable first version that proves the complete PDF-processing workflow:

1. A user uploads PDF files
2. The system validates the files
3. The user configures an operation
4. The system processes the files
5. The user downloads the result
6. Uploaded and generated files expire automatically

The MVP should prioritize reliability and usability over the number of available tools.

## MVP Users

### Guest Users

Guest users can try the product without creating an account.

Suggested restrictions:

- Limited file size
- Limited number of files
- Limited number of jobs
- Short file-retention period
- No processing history

### Registered Free Users

Free users can:

- Access a small processing history
- Use higher limits than guests
- Resume recent jobs
- Manage their uploaded files until expiration

### Paid Users

Paid users can:

- Process larger files
- Use higher daily or monthly limits
- Access batch processing
- Retain results longer
- Receive priority processing

## In Scope

### 1. PDF Upload

Users can:

- Select files from their device
- Drag and drop files
- Upload multiple files
- View upload progress
- Cancel an upload
- Remove a file before processing

Validation includes:

- PDF file signature
- Allowed MIME type
- Maximum file size
- Maximum number of files
- Maximum page count where available
- Detection of encrypted or password-protected PDFs

### 2. Merge PDF

Users can:

- Upload two or more PDFs
- Change file order
- Rename the output
- Merge all pages into one PDF
- Download the result

### 3. Split PDF

Users can:

- Split every page into a separate file
- Extract selected pages
- Split using page ranges
- Split every fixed number of pages

Example page-range input:

```text
1-5, 8, 10-12
```

### 4. Organize PDF Pages

Users can:

- View page thumbnails
- Reorder pages with drag and drop
- Rotate pages by 90-degree increments
- Delete pages
- Duplicate pages
- Extract selected pages
- Download the reorganized PDF

### 5. Job Processing

The system must support these job states:

- `CREATED`
- `WAITING_FOR_UPLOAD`
- `SCANNING`
- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`
- `EXPIRED`

The user should see:

- Current status
- Basic progress
- A helpful failure message
- A download button when complete

### 6. File Download

Users can:

- Download a completed output
- See the generated filename
- See when the file will expire

Downloads should use short-lived signed URLs.

### 7. Automatic Cleanup

Suggested retention:

| User Type | Retention |
|---|---:|
| Guest | 1 hour |
| Free | 24 hours |
| Paid | 7 days |

The exact limits may change after cost testing.

### 8. Authentication

Registered users should be able to:

- Sign up
- Sign in
- Sign out
- Reset their password
- View their processing history

Social login can be added later.

### 9. Basic Dashboard

The dashboard should show:

- Recent jobs
- Job status
- Operation type
- Creation date
- Expiration date
- Download action
- Delete action

### 10. Usage Limits

The backend must enforce limits for:

- File size
- Number of uploaded files
- Number of pages
- Number of jobs
- Storage usage
- Processing credits

Client-side validation is helpful but not sufficient.

## Out of Scope

The following features are intentionally excluded from the MVP:

- Editing existing PDF text like a word processor
- Collaborative editing
- Electronic signatures
- OCR
- PDF-to-Word conversion
- Word-to-PDF conversion
- Excel or PowerPoint conversion
- AI document chat
- Form building
- Redaction
- Document comparison
- Permanent document storage
- Native mobile applications
- Google Drive or Dropbox integration
- Public developer API
- Webhooks
- Team workspaces
- Advanced audit logs

## Functional Requirements

### Upload Requirements

- Files upload directly to private object storage
- API servers do not proxy full file bodies
- Original filenames are stored only as metadata
- Storage keys use generated identifiers
- Upload sessions expire
- An uploaded file cannot be used by another account

### Processing Requirements

- Jobs must be retryable
- A retry must not create duplicate billing events
- Workers must clean temporary files
- Failed jobs must preserve a useful error code
- Jobs must have a maximum runtime
- Output files must be validated before completion

### Download Requirements

- Download links must expire
- Users can only download their own outputs
- Expired outputs cannot be downloaded
- The original filename must be sanitized

## Non-Functional Requirements

### Security

- Private storage only
- Encryption in transit
- Encryption at rest
- Signed upload and download links
- Tenant isolation
- Rate limiting
- Input validation
- Worker sandboxing
- Automatic file expiration

### Performance

Initial targets:

- Page thumbnail visible shortly after upload
- Small browser-based operations complete within seconds
- Cloud job status updates every 2–3 seconds
- Typical cloud jobs complete within a few minutes

### Reliability

- Failed workers should not permanently lose jobs
- Queue messages should be processed idempotently
- Dead-letter queues should capture repeated failures
- File cleanup should be independently verifiable

### Observability

Track:

- Upload failures
- Invalid files
- Queue wait time
- Job duration
- Job failures by operation
- Worker CPU and memory usage
- Output size
- Cost per job

## MVP Completion Criteria

The MVP is ready for private beta when:

- A guest can merge two valid PDFs
- A user can split a PDF by selected pages
- A user can reorder, rotate, and remove pages
- Large jobs can be processed by a cloud worker
- Completed outputs can be downloaded securely
- Expired files are deleted automatically
- Users cannot access another user's files
- Failed jobs provide actionable error messages
- Basic monitoring and alerts are enabled
- Privacy and terms pages exist
