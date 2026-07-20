import { getJob, getPublicJobError } from "@/lib/aws/jobs"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: RouteContext<"/api/jobs/[jobId]">
) {
  const { jobId } = await context.params
  const job = await getJob(jobId)

  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 })
  }

  return Response.json(
    {
      status: job.status,
      pageCount: job.pageCount,
      error:
        job.status === "FAILED"
          ? getPublicJobError(job.errorCode)
          : undefined,
    },
    { headers: { "Cache-Control": "no-store" } }
  )
}
