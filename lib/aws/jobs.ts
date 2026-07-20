import "server-only"

import { GetCommand } from "@aws-sdk/lib-dynamodb"

import { jobs, jobsTableName } from "@/lib/aws/dynamodb"

export type JobStatus =
  | "WAITING_FOR_UPLOAD"
  | "QUEUED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"

export type PdfSplitJob = {
  jobId: string
  status: JobStatus
  inputKey: string
  outputKey?: string
  pageCount?: number
  errorCode?: string
  originalName?: string
  fileSize?: number
  createdAt: string
  expiresAt: number
}

const JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const JOB_STATUSES = new Set<JobStatus>([
  "WAITING_FOR_UPLOAD",
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
])

export function isValidJobId(jobId: string) {
  return JOB_ID_PATTERN.test(jobId)
}

export async function getJob(jobId: string): Promise<PdfSplitJob | null> {
  if (!isValidJobId(jobId)) return null

  const result = await jobs.send(
    new GetCommand({
      TableName: jobsTableName,
      Key: { jobId },
    })
  )

  return isPdfSplitJob(result.Item) ? result.Item : null
}

export function getPublicJobError(errorCode?: string) {
  switch (errorCode) {
    case "ENCRYPTED_PDF":
      return "Password-protected PDFs are not supported."
    case "FILE_TOO_LARGE":
      return "The uploaded PDF exceeds the 25 MB limit."
    case "INPUT_NOT_FOUND":
      return "The uploaded PDF could not be found."
    case "INVALID_PDF":
      return "The uploaded file is not a valid PDF."
    case "PAGE_LIMIT_EXCEEDED":
      return "The PDF contains too many pages."
    default:
      return "The PDF could not be split. Please try again."
  }
}

function isPdfSplitJob(value: unknown): value is PdfSplitJob {
  if (!value || typeof value !== "object") return false

  const item = value as Record<string, unknown>

  return (
    typeof item.jobId === "string" &&
    isValidJobId(item.jobId) &&
    typeof item.status === "string" &&
    JOB_STATUSES.has(item.status as JobStatus) &&
    typeof item.inputKey === "string" &&
    typeof item.createdAt === "string" &&
    typeof item.expiresAt === "number"
  )
}
