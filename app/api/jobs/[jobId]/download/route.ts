import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { getJob } from "@/lib/aws/jobs"
import { s3, s3BucketName } from "@/lib/aws/s3"

export const runtime = "nodejs"

const DOWNLOAD_URL_EXPIRY_SECONDS = 60

export async function GET(
  _request: Request,
  context: RouteContext<"/api/jobs/[jobId]/download">
) {
  const { jobId } = await context.params
  const job = await getJob(jobId)
  const expectedOutputKey = `outputs/${jobId}/pages.zip`

  if (
    !job ||
    job.status !== "COMPLETED" ||
    job.outputKey !== expectedOutputKey
  ) {
    return Response.json(
      { error: "The split PDF is not ready for download." },
      { status: 404 }
    )
  }

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: s3BucketName,
      Key: job.outputKey,
      ResponseContentDisposition:
        'attachment; filename="split-pages.zip"',
      ResponseContentType: "application/zip",
    }),
    { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS }
  )

  return Response.redirect(downloadUrl, 303)
}
