import { randomUUID } from "node:crypto"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { s3, s3BucketName } from "@/lib/aws/s3"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { jobs, jobsTableName } from "@/lib/aws/dynamodb"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 25 * 1024 * 1024
const PRESIGNED_URL_EXPIRY_SECONDS = 60

type PresignRequest = {
    fileName?: unknown
    fileSize?: unknown
    fileType?: unknown
}

type ValidPresignRequest = {
    fileName: string
    fileSize: number
    fileType: "application/pdf"
}

function isPdfRequest(body: PresignRequest): body is ValidPresignRequest {
    return (
        typeof body.fileName === "string" &&
        body.fileName.toLowerCase().endsWith(".pdf") &&
        body.fileType === "application/pdf" &&
        typeof body.fileSize === "number" &&
        Number.isFinite(body.fileSize) &&
        body.fileSize > 0 &&
        body.fileSize <= MAX_FILE_SIZE
    )
}

export async function POST(request: Request) {
    let body: PresignRequest

    try {
        body = (await request.json()) as PresignRequest
    } catch {
        return Response.json({ error: "Invalid request body." }, { status: 400 })
    }

    if (!isPdfRequest(body)) {
        return Response.json(
            { error: "Choose a PDF file no larger than 25 MB." },
            { status: 400 }
        )
    }

    const jobId = randomUUID()
    const inputKey = `inputs/${jobId}/source.pdf`

    try {
        const uploadUrl = await getSignedUrl(
            s3,
            new PutObjectCommand({
                Bucket: s3BucketName,
                Key: inputKey,
                ContentType: "application/pdf",
            }),
            { expiresIn: PRESIGNED_URL_EXPIRY_SECONDS }
        )

        await jobs.send(
            new PutCommand({
                TableName: jobsTableName,
                Item: {
                    jobId,
                    status: 'WAITING_FOR_UPLOAD',
                    inputKey,
                    originalName: body.fileName,
                    fileSize: body.fileSize,
                    createdAt: new Date().toISOString(),
                    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60,
                },
                ConditionExpression: "attribute_not_exists(jobId)"
            })
        )

        return Response.json(
            { jobId, inputKey, uploadUrl },
            { headers: { "Cache-Control": "no-store" } }
        )
    } catch (error) {
        console.error("Failed to create an s3 upload URL", error)
        return Response.json(
            { error: "Could not prepare the upload. Please try again." },
            { status: 500 }
        )
    }
}
