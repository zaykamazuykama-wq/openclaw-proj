"use client"

import { useEffect, useState } from "react"
import type { ProcessingResult, TranscriptSegment } from "@/lib/types"
import { Play, Volume2 } from "lucide-react"

type TranscriptViewProps = {
  result?: ProcessingResult | null
  activeIndex?: number
  onSelectLine?: (index: number) => void
  onResultUpdate?: (nextResult: ProcessingResult) => void
}

function formatTime(value?: number) {
  if (value === undefined || value === null) return ""
  const totalMs = Math.round(value * 1000)
  const mins = Math.floor(totalMs / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)
  const ms = Math.floor((totalMs % 1000) / 10)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
}

function SegmentCard({
  segment,
  isActive,
  speaker,
  onSelect,
}: {
  segment: TranscriptSegment
  isActive: boolean
  speaker?: string
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        isActive
          ? "border-amber-300 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
          {formatTime(segment.start)} - {formatTime(segment.end)}
        </div>
        {speaker ? (
          <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            {speaker}
          </div>
        ) : null}
        {segment.chosenVoiceName ? (
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800">
            {segment.chosenVoiceName}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            <Play className="h-3.5 w-3.5" />
            Replay
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            <Volume2 className="h-3.5 w-3.5" />
            Generate voice
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Original line</div>
          <p className="text-sm leading-6 text-stone-800">{segment.sourceText}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Natural Mongolian</div>
          <p className="text-sm leading-6 text-stone-950">{segment.mongolianText}</p>
        </div>
      </div>

      {segment.chosenVoiceReason?.length || segment.alternativeVoiceCandidates?.length ? (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-600">
          <div className="font-semibold uppercase tracking-[0.14em] text-stone-500">Voice style match debug</div>
          {segment.chosenVoiceReason?.length ? (
            <div className="mt-2">Why: {segment.chosenVoiceReason.join(", ")}</div>
          ) : null}
          {segment.alternativeVoiceCandidates?.length ? (
            <div className="mt-2">
              Alternatives: {segment.alternativeVoiceCandidates.slice(0, 3).map((candidate) => `${candidate.displayName} (${candidate.score})`).join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </button>
  )
}

export default function TranscriptView({ result, activeIndex = 0, onSelectLine, onResultUpdate }: TranscriptViewProps) {
  const segments = Array.isArray(result?.segments) ? result.segments : []
  const hasError = Boolean(result?.error)
  const isLoading = result?.stage && result.stage !== "idle" && result.stage !== "done" && result.stage !== "error"
  const voiceSummaries = Array.from(
    new Map(segments.filter((segment) => segment.chosenVoiceId).map((segment) => [segment.chosenVoiceId, segment])).values()
  )
  const [selectedMode, setSelectedMode] = useState<"keep_background" | "replace_music">(
    result?.remixArtifacts?.mode === "replace_music" ? "replace_music" : "keep_background"
  )
  const [replacementMusicInput, setReplacementMusicInput] = useState(result?.remixArtifacts?.replacementMusicPath || "")
  const [replacementMusicFile, setReplacementMusicFile] = useState<File | null>(null)
  const [jobIdCopied, setJobIdCopied] = useState(false)
  const [reopenLinkCopied, setReopenLinkCopied] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ state: "idle" | "loading" | "done" | "error"; message?: string }>({
    state: "idle",
  })

  useEffect(() => {
    setSelectedMode(result?.remixArtifacts?.mode === "replace_music" ? "replace_music" : "keep_background")
    setReplacementMusicInput(result?.remixArtifacts?.replacementMusicPath || "")
    setReplacementMusicFile(null)
    setJobIdCopied(false)
    setReopenLinkCopied(false)
  }, [result?.jobId, result?.remixArtifacts?.mode, result?.remixArtifacts?.replacementMusicPath])

  async function copyJobId() {
    if (!result?.jobId) return
    try {
      await navigator.clipboard.writeText(result.jobId)
      setJobIdCopied(true)
    } catch {
      setJobIdCopied(false)
    }
  }

  async function copyReopenLink() {
    if (!result?.jobId) return
    try {
      const reopenLink = `${window.location.origin}/?jobId=${encodeURIComponent(result.jobId)}`
      await navigator.clipboard.writeText(reopenLink)
      setReopenLinkCopied(true)
    } catch {
      setReopenLinkCopied(false)
    }
  }

  async function attachReplacementMusic() {
    if (!result?.jobId || !replacementMusicInput.trim()) {
      setExportStatus({ state: "error", message: "Enter a server-local replacement music path first." })
      return
    }

    setExportStatus({ state: "loading", message: "Attaching replacement music..." })

    try {
      const response = await fetch(
        `/api/debug/replace-music-foundation/${result.jobId}?musicPath=${encodeURIComponent(replacementMusicInput.trim())}`
      )
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setExportStatus({ state: "error", message: data.message || data.errorCode || "Replacement music attach failed." })
        return
      }

      onResultUpdate?.({
        ...result,
        remixArtifacts: {
          ...result.remixArtifacts,
          mode: "replace_music",
          replacementMusicPath: data.replacementMusicPath,
          mixedAudioPath: data.mixedAudioPath,
          exportReady: Boolean(data.exportReady),
        },
      })
      setExportStatus({ state: "done", message: "Replacement music is attached." })
    } catch (error) {
      setExportStatus({ state: "error", message: error instanceof Error ? error.message : "Replacement music attach failed." })
    }
  }

  async function uploadReplacementMusic() {
    if (!result?.jobId || !replacementMusicFile) {
      setExportStatus({ state: "error", message: "Choose a replacement music file first." })
      return
    }

    setExportStatus({ state: "loading", message: "Uploading replacement music..." })

    try {
      const formData = new FormData()
      formData.append("file", replacementMusicFile)
      const response = await fetch(`/api/debug/replace-music-foundation/${result.jobId}`, {
        method: "POST",
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setExportStatus({ state: "error", message: data.message || data.errorCode || "Replacement music upload failed." })
        return
      }

      onResultUpdate?.({
        ...result,
        remixArtifacts: {
          ...result.remixArtifacts,
          mode: "replace_music",
          replacementMusicPath: data.replacementMusicPath,
          mixedAudioPath: data.mixedAudioPath,
          exportReady: Boolean(data.exportReady),
        },
      })
      setReplacementMusicInput(data.replacementMusicPath || "")
      setReplacementMusicFile(null)
      setExportStatus({ state: "done", message: "Replacement music is uploaded." })
    } catch (error) {
      setExportStatus({ state: "error", message: error instanceof Error ? error.message : "Replacement music upload failed." })
    }
  }

  async function runRemix() {
    if (!result?.jobId || !result?.remixArtifacts) return
    setExportStatus({ state: "loading", message: "Running remix..." })

    if (selectedMode === "replace_music" && !result.remixArtifacts.replacementMusicPath) {
      setExportStatus({ state: "error", message: "Replacement music is required before replace_music remix can run." })
      return
    }

    try {
      const response = await fetch(`/api/debug/remix-test/${result.jobId}?mode=${selectedMode}`)
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setExportStatus({ state: "error", message: data.message || data.errorCode || "Remix failed." })
        return
      }

      onResultUpdate?.({
        ...result,
        remixArtifacts: {
          ...result.remixArtifacts,
          mode: (data.mode === "replace_music" ? "replace_music" : "keep_background"),
          mixedAudioPath: data.mixedAudioPath,
          exportReady: Boolean(data.mixedAudioPath),
          warnings: data.warnings || result.remixArtifacts.warnings || [],
        },
      })
      setExportStatus({ state: "done", message: "Mixed audio is ready." })
    } catch (error) {
      setExportStatus({ state: "error", message: error instanceof Error ? error.message : "Remix failed." })
    }
  }

  async function runExport() {
    if (!result?.jobId || !result?.remixArtifacts) return
    setExportStatus({ state: "loading", message: "Running export..." })

    try {
      const response = await fetch(`/api/debug/video-export/${result.jobId}`)
      const data = await response.json()
      if (!response.ok || !data.ok) {
        setExportStatus({ state: "error", message: data.message || data.errorCode || "Export failed." })
        return
      }

      onResultUpdate?.({
        ...result,
        remixArtifacts: {
          ...result.remixArtifacts,
          mode: data.mode === "replace_music" ? "replace_music" : selectedMode,
          finalVideoPath: data.finalVideoPath,
          exportReady: Boolean(data.exportReady),
          warnings: data.warnings || result.remixArtifacts.warnings || [],
        },
      })
      setExportStatus({ state: "done", message: "Final video is ready." })
    } catch (error) {
      setExportStatus({ state: "error", message: error instanceof Error ? error.message : "Export failed." })
    }
  }

  async function refreshJobState() {
    if (!result?.jobId) return
    setExportStatus({ state: "loading", message: "Refreshing job state..." })

    try {
      const response = await fetch(`/api/status/${result.jobId}`)
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        setExportStatus({ state: "error", message: data.message || data.errorCode || "Refresh failed." })
        return
      }

      onResultUpdate?.(data)
      setExportStatus({ state: "done", message: "Job state refreshed." })
    } catch (error) {
      setExportStatus({ state: "error", message: error instanceof Error ? error.message : "Refresh failed." })
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Review panel</div>
            <h2 className="mt-1 text-2xl font-semibold text-stone-950">Transcript and translation review</h2>
            <p className="mt-1 text-sm text-stone-500">Context-aware translation feeling, with room for future dubbing actions.</p>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-600">
            {segments.length > 0 ? `${segments.length} timed lines` : "No lines yet"}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {!result ? (
          <div className="rounded-[28px] border border-dashed border-stone-300 bg-[linear-gradient(180deg,#fffdf7_0%,#f7f2e9_100%)] p-8">
            <div className="max-w-2xl">
              <div className="text-lg font-semibold text-stone-950">What you will get after processing</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="text-sm font-medium text-stone-900">Transcript</div>
                  <div className="mt-1 text-sm text-stone-600">Readable original speech lines for review.</div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="text-sm font-medium text-stone-900">Natural Mongolian</div>
                  <div className="mt-1 text-sm text-stone-600">A spoken-feeling translation, not just raw machine output.</div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="text-sm font-medium text-stone-900">Timed segments</div>
                  <div className="mt-1 text-sm text-stone-600">Line-by-line timing for review and future dubbing.</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {hasError ? (
          <div className="rounded-[28px] border border-red-200 bg-[linear-gradient(180deg,#fffaf9_0%,#fff1f0_100%)] p-5">
            <div className="text-base font-semibold text-stone-950">Something needs attention</div>
            <div className="mt-2 text-sm leading-7 text-stone-600">
              The interface is ready for structured backend errors later. For now, this card keeps failures readable and non-scary.
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff6df_100%)] p-5">
            <div className="text-base font-semibold text-stone-950">Processing in progress</div>
            <div className="mt-2 text-sm leading-7 text-stone-600">
              Buttons stay calm and minimal while the transcript workspace prepares your first reviewable lines.
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
              <div className="h-20 animate-pulse rounded-2xl bg-white/70" />
            </div>
          </div>
        ) : null}

        {result?.audioArtifacts ? (
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-900">Audio separation</h2>
              <div className="text-sm text-stone-500">Read-only stem summary from the real processing response</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Applied</div>
                <div className="mt-2 text-stone-900">{result.audioArtifacts.separationApplied ? "yes" : "no"}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Mode</div>
                <div className="mt-2 text-stone-900">{result.audioArtifacts.separationMode}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Available stems</div>
                <div className="mt-2 text-stone-900">{result.audioArtifacts.availableStems.join(", ") || "none"}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Fallback used</div>
                <div className="mt-2 text-stone-900">{result.audioArtifacts.fallbackUsed ? "yes" : "no"}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">ASR input</div>
                <div className="mt-2 text-stone-900">{result.audioArtifacts.transcriptionInputPath === result.audioArtifacts.sourceMixPath ? "mix" : "dialogue stem"}</div>
              </div>
            </div>
          </div>
        ) : null}

        {result?.jobId ? (
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-900">Job ID</h2>
              <div className="text-sm text-stone-500">Reuse this id to restore the stored result later</div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-auto rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900">
                {result.jobId}
              </code>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyJobId}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                >
                  {jobIdCopied ? "Copied" : "Copy jobId"}
                </button>
                <button
                  type="button"
                  onClick={copyReopenLink}
                  className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                >
                  {reopenLinkCopied ? "Link copied" : "Copy reopen link"}
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs text-stone-600">
              {typeof window !== "undefined" ? `${window.location.origin}/?jobId=${encodeURIComponent(result.jobId)}` : `/?jobId=${result.jobId}`}
            </div>
          </div>
        ) : null}

        {result?.voiceMatchSummary ? (
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-900">Voice match summary</h2>
              <div className="text-sm text-stone-500">Read-only debug from the real upload response</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Selected voices</div>
                <div className="mt-2 text-stone-900">{result.voiceMatchSummary.selectedVoices.length}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Providers used</div>
                <div className="mt-2 text-stone-900">{result.voiceMatchSummary.providersUsed.join(", ") || "none"}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Fallback used</div>
                <div className="mt-2 text-stone-900">{result.voiceMatchSummary.fallbackUsed ? "yes" : "no"}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Candidate count</div>
                <div className="mt-2 text-stone-900">{result.voiceMatchSummary.candidateCount}</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Preview available</div>
                <div className="mt-2 text-stone-900">{result.voiceMatchSummary.providerPreviewAvailable ? "yes" : "no"}</div>
              </div>
            </div>
            {result.voiceMatchSummary.selectedVoices.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.voiceMatchSummary.selectedVoices.map((voice) => (
                  <span key={voice.id} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-700">
                    {voice.displayName}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {result?.remixArtifacts ? (
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-900">Export</h2>
              <div className="text-sm text-stone-500">Uses the current internal remix and export routes</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Remix mode</div>
                <select
                  value={selectedMode}
                  onChange={(event) => {
                    const nextMode = event.target.value === "replace_music" ? "replace_music" : "keep_background"
                    setSelectedMode(nextMode)
                    onResultUpdate?.({
                      ...result,
                      remixArtifacts: {
                        ...result.remixArtifacts,
                        mode: nextMode,
                      },
                    })
                    setExportStatus({ state: "idle" })
                  }}
                  className="mt-3 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                >
                  <option value="keep_background">keep_background</option>
                  <option value="replace_music">replace_music</option>
                </select>
                {selectedMode === "replace_music" ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4"
                      onChange={(event) => setReplacementMusicFile(event.target.files?.[0] || null)}
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={uploadReplacementMusic}
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                    >
                      Upload replacement music
                    </button>
                    <input
                      type="text"
                      value={replacementMusicInput}
                      onChange={(event) => setReplacementMusicInput(event.target.value)}
                      placeholder="/absolute/path/to/music.mp3"
                      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={attachReplacementMusic}
                      className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                    >
                      Attach replacement music
                    </button>
                    {!result.remixArtifacts.replacementMusicPath ? (
                      <div className="text-xs leading-6 text-stone-500">
                        Replacement music is required before replace_music remix can run.
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Status</div>
                <div className="mt-3 space-y-2">
                  <div>
                    Mixed audio availability: <span className="text-stone-900">{result.remixArtifacts.mixedAudioPath ? "available for preview or download" : "not available yet"}</span>
                  </div>
                  <div>
                    Final video availability: <span className="text-stone-900">{result.remixArtifacts.finalVideoPath ? "available for preview or download" : "not available yet"}</span>
                  </div>
                  <div>
                    Replacement music: <span className="text-stone-900">{result.remixArtifacts.replacementMusicPath ? "attached" : "required later"}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Actions</div>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={runRemix}
                    className="rounded-full border border-stone-300 bg-stone-900 px-4 py-2 text-sm font-medium text-white"
                  >
                    Run remix
                  </button>
                  <button
                    type="button"
                    onClick={runExport}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                  >
                    Run export
                  </button>
                  <button
                    type="button"
                    onClick={refreshJobState}
                    className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                  >
                    Refresh state
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 text-sm text-stone-700">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Runtime status</div>
              <div className="mt-2 text-stone-900">
                {exportStatus.state === "idle" ? "Ready to run remix/export for the selected mode." : exportStatus.message}
              </div>
              {result.remixArtifacts.warnings?.length ? (
                <div className="mt-3 text-xs leading-6 text-stone-500">Warnings: {result.remixArtifacts.warnings.join(" | ")}</div>
              ) : null}
              <div className="mt-3 text-xs leading-6 text-stone-500">
                Mixed audio: {result.remixArtifacts.mixedAudioPath ? "Preview or download is available below." : "No mixed audio file yet."}
              </div>
              <div className="mt-1 text-xs leading-6 text-stone-500">
                Final video: {result.remixArtifacts.finalVideoPath ? "Preview or download is available below." : "No final video export yet."}
              </div>
              {result.jobId && (result.remixArtifacts.mixedAudioPath || result.remixArtifacts.finalVideoPath) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.remixArtifacts.mixedAudioPath ? (
                    <a
                      href={`/api/debug/mixed-audio/${result.jobId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-medium text-stone-700"
                    >
                      Preview or download mixed audio
                    </a>
                  ) : null}
                  {result.remixArtifacts.finalVideoPath ? (
                    <a
                      href={`/api/debug/final-video/${result.jobId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-xs font-medium text-stone-700"
                    >
                      Preview or download final video
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {voiceSummaries.length > 0 ? (
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-stone-900">Voice style matches</h2>
              <div className="text-sm text-stone-500">Connected to the current dubbing preparation flow</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {voiceSummaries.map((segment) => (
                <div key={segment.chosenVoiceId} className="rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Best Mongolian dubbing match</div>
                  <div className="mt-2 text-base font-semibold text-stone-950">{segment.chosenVoiceName || segment.chosenVoiceId}</div>
                  <div className="mt-1 text-xs text-stone-500">{segment.chosenVoiceProvider || "voice-library"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(segment.chosenVoiceReason || []).slice(0, 3).map((reason) => (
                      <span key={reason} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] text-stone-700">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">Full source transcript</div>
            <div className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-7 text-stone-800">
              {result?.fullTranscript || "No transcript yet."}
            </div>
          </div>
          <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] p-5">
            <div className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">Natural spoken Mongolian</div>
            <div className="max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-7 text-stone-950">
              {result?.fullTranslation || "No translation yet."}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-stone-900">Line-by-line review</h2>
            <div className="text-sm text-stone-500">Active line highlighted for quick context</div>
          </div>

          {segments.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-500">
              Timed segments will appear here after processing. Each row is ready for replay/seek and future voice generation controls.
            </div>
          ) : (
            <div className="space-y-3">
              {segments.map((segment, index) => (
                <SegmentCard
                  key={`${segment.start}-${segment.end}-${index}`}
                  segment={segment}
                  isActive={index === activeIndex}
                  speaker={index % 3 === 0 ? "Speaker A" : index % 3 === 1 ? "Speaker B" : undefined}
                  onSelect={() => onSelectLine?.(index)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
