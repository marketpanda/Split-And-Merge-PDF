# Security and Privacy

## Purpose

The product processes user-controlled PDF files, which creates significant security and privacy risks.

Security must be part of the initial design rather than added after launch.

## Threat Model

Potential threats include:

- Malicious or malformed PDFs
- Malware embedded in uploaded files
- Excessively large or compressed files
- Denial-of-service through repeated processing
- Unauthorized access to another user's files
- Leaked signed URLs
- Public storage configuration
- Worker escape or command injection
- Sensitive information in logs
- Permanent retention of temporary documents
- Stolen deployment credentials
- Abuse of free processing limits
- Vulnerable native PDF libraries

## Core Security Principles

- Deny access by default
- Use least-privilege IAM permissions
- Treat every uploaded file as untrusted
- Separate file storage from the API
- Isolate processing workers
- Expire files automatically
- Avoid long-lived credentials
- Validate authorization on every request
- Log metadata, not document contents
- Keep dependencies and native tools patched

## File Upload Security

### Validation

Validate:

- Declared MIME type
- Actual file signature
- File extension
- File size
- File count
- Page count
- Password-protection status
- PDF parser result
- Suspicious embedded content where detectable

Do not trust:

- Original filename
- Browser-provided MIME type
- Client-provided page count
- Client-provided file size
- Client-provided ownership information

### File Names

- Generate storage keys server-side
- Sanitize download filenames
- Remove path separators
- Limit filename length
- Avoid executing or interpreting filenames
- Preserve the original filename only as metadata

### Upload URLs

Presigned upload URLs should:

- Expire quickly
- Allow only one expected object key
- Restrict content length where possible
- Restrict content type where practical
- Never grant list or read permissions

## Storage Security

All storage buckets must:

- Block public access
- Use encryption at rest
- Require HTTPS
- Use restrictive bucket policies
- Disable ACL-based public access
- Use lifecycle deletion
- Separate environments
- Record security-relevant access

Suggested separation:

- Quarantine uploads
- Validated inputs
- Processed outputs
- Logs

A user should never receive a permanent storage URL.

## Authorization

Every API request involving a resource must verify:

```text
resource.organization_id === authenticated.organization_id
```

Do not rely only on unpredictable IDs.

Verify ownership for:

- Upload sessions
- Input files
- Jobs
- Output files
- Downloads
- Deletions
- Billing records

## Authentication

Use a managed identity provider.

Controls:

- Email verification
- Secure password reset
- Short-lived access tokens
- Refresh-token rotation where supported
- Multi-factor authentication for administrators
- Session revocation
- Account suspension

Administrative access should use stronger authentication than normal users.

## Worker Isolation

Workers process untrusted documents.

Recommended controls:

- Run as a non-root user
- Use minimal container images
- Use read-only root filesystem where possible
- Write only to a dedicated temporary directory
- Set CPU, memory, disk, and runtime limits
- Delete temporary files in a `finally` block
- Disable privileged mode
- Drop unnecessary Linux capabilities
- Restrict outbound internet access
- Use unique working directories
- Never execute user-supplied command arguments directly
- Use safe process APIs rather than shell string interpolation

Unsafe:

```ts
exec(`qpdf ${userFilename} ${outputFilename}`);
```

Safer:

```ts
spawn("qpdf", [inputPath, outputPath], {
  shell: false,
});
```

The paths must still be generated and controlled by the application.

## Processing Limits

Enforce:

- Maximum upload size
- Maximum number of files
- Maximum pages
- Maximum total input bytes
- Maximum output bytes
- Maximum CPU time
- Maximum wall-clock time
- Maximum temporary disk usage
- Maximum concurrent jobs per account
- Maximum daily and monthly usage

Limits must be enforced on the backend.

## Malware and File Scanning

Uploaded files should enter a quarantine state.

Suggested flow:

```text
UPLOADED
  -> SCANNING
  -> CLEAN
  -> READY
```

Infected or suspicious files should be:

- Marked as rejected
- Excluded from processing
- Deleted or quarantined according to policy
- Logged without exposing contents
- Presented to the user with a generic error

## Signed Downloads

Download links should:

- Be short-lived
- Be created only after ownership checks
- Point to one specific object
- Use a safe content-disposition filename
- Be invalid after object expiration

Do not place signed URLs in logs or analytics.

## Rate Limiting and Abuse Prevention

Apply limits by:

- Account
- Organization
- IP address
- Operation type
- File volume
- Concurrent jobs

Potential controls:

- API Gateway or application rate limits
- AWS WAF rules
- CAPTCHA for suspicious guest usage
- Email verification before higher limits
- Usage credits
- Payment method requirement for very high limits
- Temporary account suspension

## API Security

- Validate every request with schemas
- Reject unknown fields where appropriate
- Use parameterized database queries
- Enforce strict CORS
- Use CSRF protection where cookie authentication is used
- Set secure HTTP headers
- Do not expose internal stack traces
- Use stable public error codes
- Rotate secrets
- Restrict webhook endpoints
- Verify billing webhook signatures

## Logging

Logs may contain:

- Request ID
- Job ID
- Tenant ID
- Operation
- Status
- Duration
- Error code
- File size
- Page count

Logs must not contain:

- PDF text
- PDF binary contents
- Passwords
- Authentication tokens
- Full signed URLs
- Payment card details
- Secret keys

Hash or truncate IP addresses when full storage is unnecessary.

## Privacy

The privacy policy should clearly explain:

- What files are uploaded
- Why files are processed
- How long files are retained
- Which cloud providers process data
- Whether metadata is retained
- How users request deletion
- Whether documents are used for AI training
- How cookies and analytics are used

Only make privacy claims that are technically enforced.

## File Retention

Suggested defaults:

| Account | Input and Output Retention |
|---|---:|
| Guest | 1 hour |
| Free | 24 hours |
| Paid | 7 days |

Retention should be enforced through:

- Database expiration timestamps
- S3 lifecycle policies
- Scheduled cleanup verification
- Alerts for failed deletion

## Secrets and Credentials

Use:

- GitHub Actions OIDC for AWS deployment
- AWS IAM roles for workloads
- Secrets Manager for application secrets
- Short-lived credentials

Never commit:

- `.env` files with real secrets
- AWS access keys
- Database passwords
- Billing provider secrets
- Production certificates

## Dependency Security

- Pin dependency versions appropriately
- Enable automated dependency alerts
- Scan Docker images
- Patch qpdf and native libraries
- Use lockfiles
- Remove unused packages
- Review licenses
- Run static analysis
- Test malformed PDF inputs

## Incident Response

Document procedures for:

1. Detecting an incident
2. Restricting affected access
3. Rotating credentials
4. Preserving relevant logs
5. Identifying affected users
6. Removing malicious content
7. Restoring clean services
8. Notifying users where required
9. Performing a post-incident review

## Security Launch Checklist

- [ ] S3 public access blocked
- [ ] Encryption enabled
- [ ] Signed URLs expire
- [ ] File ownership checks tested
- [ ] Cross-tenant access tests pass
- [ ] Worker runs as non-root
- [ ] Shell injection tests pass
- [ ] File-size limits enforced
- [ ] Page limits enforced
- [ ] Job timeouts enforced
- [ ] Rate limits enabled
- [ ] Malware scanning enabled
- [ ] Cleanup verified
- [ ] Logs reviewed for sensitive data
- [ ] Production secrets stored securely
- [ ] Dependency scanning enabled
- [ ] Backup and restore procedure tested
