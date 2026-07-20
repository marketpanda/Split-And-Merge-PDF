import { PassThrough } from "node:stream"

import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import {
  DynamoDBDocumentClient,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb"
import { Upload } from "@aws-sdk/lib-storage"
import type { S3Event, SQSBatchResponse, SQSEvent } from "aws-lambda"
import archiver from "archiver"
import { PDFDocument } from "pdf-lib"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const DEFAULT_MAX_PAGE_COUNT = 500
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const bucketName = getRequiredEnvironmentVariable("AWS_S3_BUCKET_NAME")
const jobsTableName = getRequiredEnvironmentVariable("AWS_JOBS_TABLE_NAME")
const maxPageCount = getPositiveIntegerEnvironmentVariable(
  "MAX_PDF_PAGE_COUNT",
  DEFAULT_MAX_PAGE_COUNT
)

const s3 = new S3Client({})
const jobs = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
})

class ProcessingError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ProcessingError"
  }
}

export async function handler(event: SQSEvent): Promise<SQSBatchResponse> {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = []

  for (const message of event.Records) {
    try {
      await processSqsMessage(message.body)
    } catch (error) {
      console.error("Failed to process PDF split message", {
        messageId: message.messageId,
        error,
      })
      batchItemFailures.push({ itemIdentifier: message.messageId })
    }
  }

  return { batchItemFailures }
}

async function processSqsMessage(body: string) {
  const s3Event = parseS3Event(body)

  for (const record of s3Event.Records) {
    if (record.s3.bucket.name !== bucketName) {
      throw new ProcessingError(
        "INVALID_INPUT_BUCKET",
        "The event references an unexpected S3 bucket."
      )
    }

    const inputKey = decodeURIComponent(
      record.s3.object.key.replace(/\+/g, " ")
    )
    const jobId = extractJobId(inputKey)

    await processJob(jobId, inputKey)
  }
}

async function processJob(jobId: string, inputKey: string) {
  await markJobProcessing(jobId)

  try {
    const { outputKey, pageCount } = await splitPdf(jobId, inputKey)
    await markJobCompleted(jobId, outputKey, pageCount)
  } catch (error) {
    const code = getPublicErrorCode(error)

    await markJobFailed(jobId, code)
    throw error
  }
}

async function splitPdf(jobId: string, inputKey: string) {
  const metadata = await s3.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: inputKey,
    })
  )

  if (!metadata.ContentLength || metadata.ContentLength > MAX_FILE_SIZE) {
    throw new ProcessingError(
      "FILE_TOO_LARGE",
      "The uploaded PDF has an invalid file size."
    )
  }

  const object = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: inputKey,
    })
  )

  if (!object.Body) {
    throw new ProcessingError("INPUT_NOT_FOUND", "The PDF body is missing.")
  }

  const inputBytes = await object.Body.transformToByteArray()

  if (!hasPdfSignature(inputBytes)) {
    throw new ProcessingError("INVALID_PDF", "The file is not a valid PDF.")
  }

  let sourcePdf: PDFDocument

  try {
    sourcePdf = await PDFDocument.load(inputBytes, {
      updateMetadata: false,
    })
  } catch (error) {
    if (error instanceof Error && /encrypt/i.test(error.message)) {
      throw new ProcessingError(
        "ENCRYPTED_PDF",
        "Password-protected PDFs are not supported."
      )
    }

    throw new ProcessingError("INVALID_PDF", "The PDF could not be read.")
  }

  const pageCount = sourcePdf.getPageCount()

  if (pageCount < 1) {
    throw new ProcessingError("INVALID_PDF", "The PDF has no pages.")
  }

  if (pageCount > maxPageCount) {
    throw new ProcessingError(
      "PAGE_LIMIT_EXCEEDED",
      `The PDF exceeds the ${maxPageCount}-page limit.`
    )
  }

  const outputKey = `outputs/${jobId}/pages.zip`
  const outputStream = new PassThrough()
  const archive = archiver("zip", { zlib: { level: 0 } })

  archive.on("warning", (error) => {
    if (error.code !== "ENOENT") outputStream.destroy(error)
  })
  archive.on("error", (error) => outputStream.destroy(error))
  archive.pipe(outputStream)

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucketName,
      Key: outputKey,
      Body: outputStream,
      ContentType: "application/zip",
      ContentDisposition: 'attachment; filename="split-pages.zip"',
    },
    queueSize: 2,
    leavePartsOnError: false,
  })
  const uploadPromise = upload.done()

  try {
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const pagePdf = await PDFDocument.create()
      const [page] = await pagePdf.copyPages(sourcePdf, [pageIndex])

      pagePdf.addPage(page)

      const pageBytes = await pagePdf.save()
      const pageNumber = String(pageIndex + 1).padStart(3, "0")

      archive.append(Buffer.from(pageBytes), {
        name: `page-${pageNumber}.pdf`,
        store: true,
      })
    }

    await archive.finalize()
    await uploadPromise
  } catch (error) {
    archive.abort()
    outputStream.destroy()
    await upload.abort().catch(() => undefined)
    await uploadPromise.catch(() => undefined)
    throw error
  }

  return { outputKey, pageCount }
}

async function markJobProcessing(jobId: string) {
  const now = new Date().toISOString()

  await jobs.send(
    new UpdateCommand({
      TableName: jobsTableName,
      Key: { jobId },
      UpdateExpression:
        "SET #status = :status, startedAt = if_not_exists(startedAt, :now), updatedAt = :now REMOVE errorCode",
      ConditionExpression: "attribute_exists(jobId) AND #status <> :completed",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "PROCESSING",
        ":completed": "COMPLETED",
        ":now": now,
      },
    })
  )
}

async function markJobCompleted(
  jobId: string,
  outputKey: string,
  pageCount: number
) {
  const now = new Date().toISOString()

  await jobs.send(
    new UpdateCommand({
      TableName: jobsTableName,
      Key: { jobId },
      UpdateExpression:
        "SET #status = :status, outputKey = :outputKey, pageCount = :pageCount, completedAt = :now, updatedAt = :now REMOVE errorCode",
      ConditionExpression: "attribute_exists(jobId)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "COMPLETED",
        ":outputKey": outputKey,
        ":pageCount": pageCount,
        ":now": now,
      },
    })
  )
}

async function markJobFailed(jobId: string, errorCode: string) {
  const now = new Date().toISOString()

  try {
    await jobs.send(
      new UpdateCommand({
        TableName: jobsTableName,
        Key: { jobId },
        UpdateExpression:
          "SET #status = :status, errorCode = :errorCode, failedAt = :now, updatedAt = :now",
        ConditionExpression: "attribute_exists(jobId) AND #status <> :completed",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": "FAILED",
          ":completed": "COMPLETED",
          ":errorCode": errorCode,
          ":now": now,
        },
      })
    )
  } catch (error) {
    console.error("Failed to update the PDF job failure status", {
      jobId,
      error,
    })
  }
}

function parseS3Event(body: string): S3Event {
  let parsed: unknown

  try {
    parsed = JSON.parse(body)
  } catch {
    throw new ProcessingError(
      "INVALID_EVENT",
      "The SQS message does not contain valid JSON."
    )
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("Records" in parsed) ||
    !Array.isArray(parsed.Records)
  ) {
    throw new ProcessingError(
      "INVALID_EVENT",
      "The SQS message does not contain an S3 event."
    )
  }

  return parsed as S3Event
}

function extractJobId(inputKey: string) {
  const match = /^inputs\/([^/]+)\/source\.pdf$/i.exec(inputKey)
  const jobId = match?.[1]

  if (!jobId || !UUID_PATTERN.test(jobId)) {
    throw new ProcessingError(
      "INVALID_INPUT_KEY",
      "The S3 object key does not contain a valid job ID."
    )
  }

  return jobId
}

function hasPdfSignature(bytes: Uint8Array) {
  const header = Buffer.from(bytes.subarray(0, 1024))
  return header.includes(Buffer.from("%PDF-"))
}

function getPublicErrorCode(error: unknown) {
  return error instanceof ProcessingError ? error.code : "PROCESSING_FAILED"
}

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name]

  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getPositiveIntegerEnvironmentVariable(
  name: string,
  fallback: number
) {
  const rawValue = process.env[name]

  if (!rawValue) return fallback

  const value = Number(rawValue)

  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`)
  }

  return value
}
