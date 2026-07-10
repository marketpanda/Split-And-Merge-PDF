# Pricing Strategy

## Objective

Create pricing that is:

- Easy to understand
- Affordable for occasional users
- Sustainable for cloud processing
- Flexible enough for heavier business use
- Protected against unlimited resource consumption

The figures below are initial hypotheses and must be validated with real usage and competitor research.

## Pricing Principles

### Do Not Offer Unlimited Processing Initially

PDF processing cost varies by:

- File size
- Number of pages
- Number of files
- Operation type
- CPU time
- Temporary storage
- Output size
- OCR usage

Use fair-use limits or credits.

### Keep Basic Tools Accessible

Merge, split, reorder, rotate, and delete-pages should remain easy to try.

### Charge More for Expensive Operations

Possible higher-cost operations:

- OCR
- Compression
- Office conversion
- Batch processing
- Long retention
- API access

## Suggested Plans

## Guest

Price:

```text
Free
```

Suggested limits:

- No account required
- Up to 3 input files
- Up to 20 MB per file
- Up to 50 total pages
- Limited daily jobs
- 1-hour retention
- Basic merge, split, rotate, and organize
- Standard queue

Purpose:

- Let users experience the product immediately
- Improve search-engine conversion
- Encourage registration

## Free Account

Price:

```text
Free
```

Suggested limits:

- Up to 50 MB per file
- Up to 5 files per job
- Up to 100 pages per job
- 5 cloud jobs per day
- 24-hour retention
- Recent job history
- Basic tools
- Standard queue

Purpose:

- Build habit
- Collect product feedback
- Convert frequent users to paid plans

## Pro

Initial price hypothesis:

```text
USD 7–10 per month
or approximately PHP 399–599 per month
```

Suggested limits:

- Up to 500 MB per file
- Up to 20 files per job
- Higher page limits
- Higher monthly credits
- 7-day retention
- Batch processing
- Watermarks
- Page numbers
- Compression
- Priority queue
- No advertisements
- Email support

Possible annual discount:

```text
Two months free on annual billing
```

## Business

Initial price hypothesis:

```text
USD 25–40 per month
or approximately PHP 1,499–2,299 per month
```

Suggested features:

- Multiple team members
- Shared organization workspace
- Higher processing limits
- Longer retention
- Basic audit log
- Priority support
- API access
- Webhooks
- Central billing
- Custom branding later

## Usage Credits

A credit system can protect infrastructure costs.

Example model:

```text
1 standard credit = processing up to 50 pages
```

Possible multipliers:

| Operation | Suggested Cost |
|---|---:|
| Merge | 1x |
| Split | 1x |
| Reorder/rotate | 1x |
| Watermark | 1x |
| Compression | 2x |
| OCR | 3x–5x |
| Office conversion | 3x–5x |

The model must be adjusted using measured compute cost.

## Pay-As-You-Go

Possible later option:

```text
100 credits
500 credits
2,000 credits
```

This is useful for users who do not want a subscription.

Credits may expire after a clearly disclosed period.

## API Pricing

Do not include the public API in the first MVP.

Possible later structure:

### Developer

- Monthly included credits
- API keys
- Webhooks
- Rate limits
- Basic logs

### Scale

- Higher concurrency
- Volume discounts
- Dedicated support
- Custom retention
- Service-level agreement

## Cost Model

Track cost per completed job.

Estimated components:

```text
Storage input cost
+ Storage output cost
+ S3 request cost
+ Data transfer
+ Queue requests
+ Worker compute
+ Database usage
+ Logging
+ Malware scanning
+ Payment processing
+ Support
```

Record actual usage:

- Input bytes
- Output bytes
- Pages processed
- Job duration
- CPU allocation
- Memory allocation
- Operation type
- Retry count

## Gross Margin Target

A reasonable long-term target for a software service is high gross margin, but actual early margins may be lower while traffic is small.

Do not finalize pricing until you know:

- Average job cost
- 95th-percentile job cost
- Free-user conversion
- Average jobs per paid user
- Support burden
- Payment fees
- Malware-scanning cost

## Philippine Market Considerations

Possible payment methods later:

- Credit and debit cards
- GCash
- Maya
- Bank transfer for business plans

Do not add multiple payment providers before validating demand.

Start with one reliable billing provider.

## Upgrade Triggers

Show a clear upgrade message when a user reaches:

- File-size limit
- Page limit
- Daily job limit
- Monthly credit limit
- Batch-processing requirement
- Advanced-operation requirement
- Retention requirement

Avoid interrupting users before they understand the product's value.

## Pricing Validation Plan

### Stage 1: Private Beta

- Free access
- Hard resource limits
- Measure real usage
- Interview active testers

### Stage 2: Public Beta

- Guest and Free plans
- One Pro plan
- No Business plan yet
- Test price points

### Stage 3: Commercial Launch

- Guest
- Free
- Pro
- Business or API plan
- Annual billing

## Metrics

Track:

- Visitor-to-upload conversion
- Upload-to-completed-job conversion
- Registration rate
- Free-to-paid conversion
- Monthly recurring revenue
- Churn
- Average revenue per user
- Credits consumed per paid user
- Compute cost per job
- Gross margin by plan
- Refund rate
