"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { VideoUpload } from "@/components/video-upload"
import { ProcessingStatus } from "@/components/processing-status"
import TranscriptView from "@/components/transcript-view"
import { WorkspacePreview } from "@/components/workspace-preview"
import { Button } from "@/components/ui/button"
import type { ProcessingResult } from "@/lib/types"
import { Globe2, RotateCcw } from "lucide-react"

export default function Home() {
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const [systemStatus, setSystemStatus] = useState<{
    ffmpeg: { available: boolean; message: string }
    ytdlp: { available: boolean; message: string }
    elevenlabs: { configured: boolean; voiceMappingsConfigured: boolean; voiceMappingCount: number; message: string }
  } | null>(null)
  const [restoreJobId, setRestoreJobId] = useState("")
  const [restoreStatus, setRestoreStatus] = useState<{
    state: "idle" | "loading" | "error" | "done"
    source?: "url" | "manual" | "recent"
    message?: string
  }>({ state: "idle" })
  const [recentJobs, setRecentJobs] = useState<
    Array<{
      jobId: string
      updatedAt: string
      sourceName: string
      sourceType: ProcessingResult["sourceType"]
      stage: ProcessingResult["stage"]
      remixMode?: string
      mixedAudioReady: boolean
      finalVideoReady: boolean
    }>
  >([])

  const handleStart = (nextResult: ProcessingResult) => {
    setResult(nextResult)
    setActiveLineIndex(0)
  }

  const handleSuccess = (nextResult: ProcessingResult) => {
    setResult(nextResult)
    setActiveLineIndex(0)
  }

  const handleReset = () => {
    setResult(null)
    setActiveLineIndex(0)
  }

  const handleRestore = async (jobIdInput?: string, source: "url" | "manual" | "recent" = "manual") => {
    const jobId = (jobIdInput || restoreJobId).trim()
    if (!jobId) {
      setRestoreStatus({ state: "error", source, message: "Enter a jobId first." })
      return
    }

    setRestoreStatus({
      state: "loading",
      source,
      message:
        source === "url" ? "Restoring result from URL..." : source === "recent" ? "Restoring recent job..." : "Restoring result from jobId...",
    })
    try {
      const response = await fetch(`/api/status/${encodeURIComponent(jobId)}`)
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        setRestoreStatus({
          state: "error",
          source,
          message: data.message || data.errorCode || "Restore failed.",
        })
        return
      }

      setResult(data)
      setActiveLineIndex(0)
      setRestoreStatus({
        state: "done",
        source,
        message:
          source === "url"
            ? "Stored result restored from URL."
            : source === "recent"
              ? "Recent job restored."
              : "Stored result restored from jobId.",
      })
    } catch (error) {
      setRestoreStatus({
        state: "error",
        source,
        message: error instanceof Error ? error.message : "Restore failed.",
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadSystemStatus() {
      try {
        const response = await fetch("/api/system/status")
        const data = await response.json()
        if (!cancelled) {
          setSystemStatus(
            data?.ffmpeg && data?.ytdlp && data?.elevenlabs
              ? {
                  ffmpeg: data.ffmpeg,
                  ytdlp: data.ytdlp,
                  elevenlabs: data.elevenlabs,
                }
              : null
          )
        }
      } catch {
        if (!cancelled) {
          setSystemStatus(null)
        }
      }
    }

    async function loadRecentJobs() {
      try {
        const response = await fetch("/api/status/recent")
        const data = await response.json()
        if (!cancelled) {
          setRecentJobs(Array.isArray(data?.jobs) ? data.jobs : [])
        }
      } catch {
        if (!cancelled) {
          setRecentJobs([])
        }
      }
    }

    loadSystemStatus()
    loadRecentJobs()
    return () => {
      cancelled = true
    }
  }, [result?.jobId])

  useEffect(() => {
    const jobIdFromUrl = new URLSearchParams(window.location.search).get("jobId")?.trim()
    if (!jobIdFromUrl) return
    if (result?.jobId === jobIdFromUrl) return

    setRestoreJobId(jobIdFromUrl)
    void handleRestore(jobIdFromUrl, "url")
  }, [result?.jobId])

  const activeLine =
    result && Array.isArray(result.segments) && result.segments.length > 0
      ? result.segments[Math.min(activeLineIndex, result.segments.length - 1)]
      : null

  const isProcessing = Boolean(result?.stage && result.stage !== "idle" && result.stage !== "done" && result.stage !== "error")
  const setupWarnings = systemStatus
    ? [
        !systemStatus.ffmpeg.available ? "ffmpeg is required for upload processing, remix, and export." : null,
        !systemStatus.ytdlp.available ? "yt-dlp is missing, so Paste URL may be unavailable locally." : null,
        !systemStatus.elevenlabs.configured ? "ElevenLabs is not configured, so provider-backed voice generation previews will stay unavailable." : null,
        systemStatus.elevenlabs.configured && !systemStatus.elevenlabs.voiceMappingsConfigured
          ? "ElevenLabs is connected, but no voice mappings were found for the current cast voices."
          : null,
      ].filter(Boolean)
    : []

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f0e4d0_52%,#ede7dc_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[32px] border border-stone-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Globe2 className="h-3.5 w-3.5" />
                Mongolian video translation / dubbing
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Video-first transcript review for natural Mongolian
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                A first MVP scaffold inspired by video-first review tools and contextual translation UX. Upload a clip, inspect the original transcript, and compare it against a spoken-feeling Mongolian version line by line.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Primary path</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Upload File</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Secondary path</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Paste URL</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Future-ready</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Dubbing controls</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-stone-200 px-5 py-4 sm:px-6">
            <Link
              href="/voice-library"
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Character voice library
            </Link>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <VideoUpload onStart={handleStart} onSuccess={handleSuccess} />
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Local setup readiness</div>
                <div className="text-sm text-stone-500">Read-only checks from the current backend</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "ffmpeg",
                    ready: Boolean(systemStatus?.ffmpeg.available),
                    detail: systemStatus?.ffmpeg.available ? "Available for media processing" : "Missing",
                  },
                  {
                    label: "yt-dlp",
                    ready: Boolean(systemStatus?.ytdlp.available),
                    detail: systemStatus?.ytdlp.available ? "Available for URL import" : "Missing",
                  },
                  {
                    label: "ElevenLabs",
                    ready: Boolean(systemStatus?.elevenlabs.configured),
                    detail: systemStatus?.elevenlabs.configured
                      ? systemStatus?.elevenlabs.voiceMappingsConfigured
                        ? `${systemStatus.elevenlabs.voiceMappingCount} voice mapping${systemStatus.elevenlabs.voiceMappingCount === 1 ? "" : "s"} ready`
                        : "API key present, no voice mappings yet"
                      : "Not configured",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-stone-900">{item.label}</div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          item.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {item.ready ? "ready" : "missing"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-stone-600">{item.detail}</div>
                  </div>
                ))}
              </div>
              {systemStatus ? (
                setupWarnings.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {setupWarnings.join(" ")}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Local setup looks ready for upload, media processing, and optional provider-backed voice work.
                  </div>
                )
              ) : (
                <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Runtime readiness checks are unavailable right now.
                </div>
              )}
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Restore job</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={restoreJobId}
                  onChange={(event) => setRestoreJobId(event.target.value)}
                  placeholder="Paste a jobId"
                  className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                />
                <Button type="button" variant="outline" onClick={handleRestore} className="rounded-full border-stone-300 bg-white px-5">
                  Restore result
                </Button>
              </div>
              {restoreStatus.message ? (
                <div
                  className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                    restoreStatus.state === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : restoreStatus.state === "loading"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-stone-200 bg-stone-50 text-stone-700"
                  }`}
                >
                  {restoreStatus.message}
                </div>
              ) : (
                <div className="mt-3 text-sm text-stone-500">Reuse an existing jobId to reload the latest stored result.</div>
              )}
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Recent jobs</div>
                <div className="text-sm text-stone-500">{recentJobs.length > 0 ? `${recentJobs.length} stored` : "No stored jobs yet"}</div>
              </div>
              {recentJobs.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {recentJobs.map((job) => (
                    <div key={job.jobId} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-stone-900">{job.sourceName}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {job.jobId} · {job.sourceType || "unknown"} · {job.stage}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {job.remixMode || "keep_background"} · mixed {job.mixedAudioReady ? "ready" : "not ready"} · video {job.finalVideoReady ? "ready" : "not ready"}
                        </div>
                        <div className="mt-1 text-xs text-stone-500 break-all">{typeof window !== "undefined" ? `${window.location.origin}/?jobId=${encodeURIComponent(job.jobId)}` : `/?jobId=${job.jobId}`}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRestoreJobId(job.jobId)
                          void handleRestore(job.jobId, "recent")
                        }}
                        className="rounded-full border-stone-300 bg-white px-5"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-stone-500">Persisted jobs will appear here after processing.</div>
              )}
            </div>
            <ProcessingStatus result={result} />
            <WorkspacePreview
              mediaName={result?.sourceName}
              sourceType={result?.sourceType}
              currentLine={activeLine}
              detectedLanguage={result?.detectedLanguage}
              isProcessing={isProcessing}
              hasResult={Boolean(result?.segments?.length)}
            />
          </div>

          <div className="space-y-6">
            <TranscriptView
              result={result}
              activeIndex={activeLineIndex}
              onSelectLine={setActiveLineIndex}
              onResultUpdate={setResult}
            />

            {result && (
              <div className="flex justify-center xl:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2 rounded-full border-stone-300 bg-white px-5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
