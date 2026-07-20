import "server-only"

import { S3Client } from "@aws-sdk/client-s3"

function getRequiredEnvironmentVariable(name: string) {
    const value = process.env[name]

    if (!value) throw new Error(`Missing required environment variable: ${name}`)
    return value
}

export const s3BucketName = getRequiredEnvironmentVariable("AWS_S3_BUCKET_NAME")

export const s3 = new S3Client({
    region: getRequiredEnvironmentVariable("AWS_REGION")
})
