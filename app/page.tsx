"use client"

import { useRef, useState } from "react"
import {
  Cancel01Icon,
  CloudUploadIcon,
  FileAttachmentIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const MAX_FILE_SIZE = 25 * 1024 * 1024

type UploadStatus = "idle" | "uploading" | "success" | "processing"

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [error, setError] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  function selectFile(nextFile: File | null) {
    setStatus("idle")
    setError(null)
    setDownloadUrl(null)

    if (!nextFile) {
      setFile(null)
      return
    }

    if (
      (nextFile.type && nextFile.type !== "application/pdf") ||
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null)
      setError("Choose a PDF file.")
      return
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null)
      setError("The PDF must be no larger than 25 MB.")
      return
    }

    setFile(nextFile)
  }

  function clearFile() {
    setFile(null)
    setStatus("idle")
    setError(null)
    setDownloadUrl(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function uploadAndSplit() {
    if (!file) return

    setStatus("uploading")
    setError(null)

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: "application/pdf",
        }),
      })

      const prepared = (await presignResponse.json()) as {
        jobId?: string
        uploadUrl?: string
        error?: string
      }

      if (!presignResponse.ok || !prepared.jobId || !prepared.uploadUrl) {
        throw new Error(prepared.error ?? "Could not prepare the upload.")
      }

      const uploadResponse = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error("The upload to S3 failed. Please try again.")
      }

      setStatus("processing")
      await pollJob(prepared.jobId)
    } catch (error) {
      setStatus("idle")
      setError(
        error instanceof Error
          ? error.message
          : "The upload failed. Please try again."
      )
    }
  }

  async function pollJob(jobId: string) {
    const maximumPollAttempts = 150

    for (let attempt = 0; attempt < maximumPollAttempts; attempt++) {
      const response = await fetch(`/api/jobs/${jobId}`, {
        cache: "no-store",
      })

      const job = (await response.json()) as {
        status?:
          | "WAITING_FOR_UPLOAD"
          | "QUEUED"
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED"
        error?: string
      }

      if (!response.ok || !job.status) {
        throw new Error(job.error ?? "Could not check the split job.")
      }

      if (job.status === "COMPLETED") {
        setStatus("success")
        setDownloadUrl(`/api/jobs/${jobId}/download`)
        return
      }

      if (job.status === "FAILED") {
        throw new Error(job.error ?? "The PDF could not be split.")
      }
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    throw new Error("The PDF is taking too long to process. Please try again.")
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 p-6 font-sans">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Upload attachment</CardTitle>
          <CardDescription>
            Add a PDF document to organize, split, or merge.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <label
            className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted/50 ${
              isDragging ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              selectFile(event.dataTransfer.files[0] ?? null)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              disabled={status === "uploading" || status === "processing"}
              onChange={(event) =>
                selectFile(event.target.files?.[0] ?? null)
              }
            />
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={CloudUploadIcon} className="size-6" />
            </span>
            <span className="font-medium">Drop your PDF here</span>
            <span className="mt-1 text-sm text-muted-foreground">
              or click to browse your files
            </span>
            <span className="mt-4 text-xs text-muted-foreground">
              PDF files only, up to 25 MB
            </span>
          </label>

          {file && (
            <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <HugeiconsIcon
                icon={FileAttachmentIcon}
                className="size-5 shrink-0 text-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove attachment"
                disabled={status === "uploading" || status === "processing"}
                onClick={clearFile}
              >
                <HugeiconsIcon icon={Cancel01Icon} />
              </Button>
            </div>
          )}

          {status === "success" && (
            <p className="mt-3 text-sm text-green-700" role="status">
              Your PDF has been split and is ready to download.
            </p>
          )}

          {status === "processing" && (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Splitting every page into a separate PDF...
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          {status === "success" && downloadUrl ? (
            <Button
              type="button"
              onClick={() => window.location.assign(downloadUrl)}
            >
              Download ZIP
            </Button>
          ) : (
            <Button
              type="button"
              disabled={
                !file || status === "uploading" || status === "processing"
              }
              onClick={uploadAndSplit}
            >
              {status === "uploading"
                ? "Uploading..."
                : status === "processing"
                  ? "Splitting..."
                  : "Upload and split"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  )
}
