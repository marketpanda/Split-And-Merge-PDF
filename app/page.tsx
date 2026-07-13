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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function clearFile() {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ""
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
              setFile(event.dataTransfer.files[0] ?? null)
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <HugeiconsIcon icon={CloudUploadIcon} className="size-6" />
            </span>
            <span className="font-medium">Drop your PDF here</span>
            <span className="mt-1 text-sm text-muted-foreground">
              or click to browse your files
            </span>
            <span className="mt-4 text-xs text-muted-foreground">
              PDF files only
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
                onClick={clearFile}
              >
                <HugeiconsIcon icon={Cancel01Icon} />
              </Button>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="button" disabled={!file}>
            Upload attachment
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
