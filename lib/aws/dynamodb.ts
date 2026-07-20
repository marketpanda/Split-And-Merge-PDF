import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"
import "server-only"


function getRequiredEnvironmentVariable(name: string) {
    const value = process.env[name]
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

const dynamodb = new DynamoDBClient({
    region: getRequiredEnvironmentVariable("AWS_REGION")
})

export const jobs = DynamoDBDocumentClient.from(dynamodb)

export const jobsTableName = getRequiredEnvironmentVariable("AWS_JOBS_TABLE_NAME")
