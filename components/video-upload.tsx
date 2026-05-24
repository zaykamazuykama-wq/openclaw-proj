"use client"

import { useState } from "react"
import type { ProcessingResult } from "@/lib/types"
import { FileUp, Link2, Loader2, Sparkles, Video } from "lucide-react"

type VideoUploadProps = {
  onStart?: (data: ProcessingResult) => void
  onSuccess?: (data: ProcessingResult) => void
}

const SUPPORTED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".m4a"]
const MAX_UPLOAD_MB = 500

function prettifyError(message: string) {
  const clean = (message || "").trim()

  if (!clean) return "Алдаа гарлаа"

  if (/This link is protected or requires sign-in/i.test(clean)) {
    return clean
  }

  return clean
}

function validateFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    return `Unsupported format: ${extension || "unknown"}. Supported formats: ${SUPPORTED_EXTENSIONS.join(", ")}`
  }

  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `File is too large. Maximum allowed size is ${MAX_UPLOAD_MB} MB.`
  }

  return ""
}

export function VideoUpload({ onStart, onSuccess }: VideoUploadProps) {
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload")
  const [error, setError] = useState("")
  const sourceType: ProcessingResult["sourceType"] = activeTab === "upload" ? "file" : "url"

  const handleSubmit = async () => {
    if (isUploading) return

    if (activeTab === "upload" && !file) {
      setError("Файл сонгоно уу")
      return
    }

    if (activeTab === "url" && !url.trim()) {
      setError("URL оруулна уу")
      return
    }

    try {
      setError("")
      setIsUploading(true)

      const initialStage: ProcessingResult = {
        success: false,
        stage: "upload",
        progress: 10,
        logs: [
          activeTab === "upload"
            ? "Upload started. The server will validate the file, extract audio, transcribe, and translate."
            : "URL processing started. Public links may work, but protected links will fail gracefully.",
        ],
        sourceName: activeTab === "upload" ? file?.name || "" : url.trim(),
        sourceType,
        detectedLanguage: "",
        fullTranscript: "",
        fullTranslation: "",
        segments: [],
      }
      onStart?.(initialStage)

      const formData = new FormData()
      if (activeTab === "upload" && file) {
        formData.append("file", file)
      }
      if (activeTab === "url") {
        formData.append("url", url.trim())
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = (await res.json()) as ProcessingResult

      if (!res.ok) {
        throw new Error(prettifyError(data?.error || "Upload failed"))
      }

      onSuccess?.(data)
    } catch (err: any) {
      setError(prettifyError(err?.message || "Алдаа гарлаа"))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-[linear-gradient(180deg,#fffaf1_0%,#ffffff_100%)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              Upload-first workflow
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-stone-950 sm:text-3xl">Start with a clip, not a setup form</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              Upload File is the primary path. Paste URL stays available for public links, but the interface keeps media upload front and center for the first MVP.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-stone-500">You get</div>
              <div className="mt-1 text-sm font-medium text-stone-900">Original transcript</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-stone-500">You get</div>
              <div className="mt-1 text-sm font-medium text-stone-900">Natural Mongolian</div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-stone-500">You get</div>
              <div className="mt-1 text-sm font-medium text-stone-900">Timed review lines</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              activeTab === "upload"
                ? "border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/10"
                : "border-stone-200 bg-white text-stone-700"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload File
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
              activeTab === "url"
                ? "border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/10"
                : "border-stone-200 bg-white text-stone-700"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Paste URL
            </span>
          </button>
        </div>

        {activeTab === "upload" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-stone-700">Video or audio file</span>
              <div className="rounded-[28px] border border-dashed border-stone-300 bg-[linear-gradient(180deg,#fffdf7_0%,#f8f3ea_100%)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-stone-900 p-3 text-white">
                      <Video className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-stone-950">Upload a clip for transcript review</div>
                      <div className="mt-1 text-sm leading-6 text-stone-600">
                        Works with horizontal and vertical videos, plus audio-only files.
                      </div>
                    </div>
                  </div>
                  <div className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600">
                    Max {MAX_UPLOAD_MB} MB
                  </div>
                </div>
                <input
                  type="file"
                  accept=".mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a,video/*,audio/*"
                  onChange={(e) => {
                    const nextFile = e.target.files?.[0] || null
                    setFile(nextFile)
                    if (nextFile) {
                      setError(validateFile(nextFile))
                    } else {
                      setError("")
                    }
                  }}
                  className="mt-5 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-4 text-sm text-stone-700"
                />
                <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm text-stone-600">
                  Supports: mp4, mov, mkv, webm, mp3, wav, m4a. Best results come from clear speech and a single main speaker.
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
              <label className="mb-2 block text-sm font-medium text-stone-700">Media URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none"
              />
              <p className="mt-3 text-xs leading-6 text-stone-500">
                Secondary path only. Public URLs may work, but protected links, sign-in links, and blocked sources may fail gracefully.
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isUploading || !!error}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-lg shadow-stone-900/10 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:shadow-none"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {isUploading ? "Processing..." : activeTab === "upload" ? "Upload and Process" : "Process URL"}
        </button>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-[linear-gradient(180deg,#fff7f7_0%,#fff0f0_100%)] p-4 text-sm text-red-700 whitespace-pre-wrap break-words">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  )
}
