import type { ProcessingResult, ProcessingStage } from "@/lib/types"

type ProcessingStatusProps = {
  result?: ProcessingResult | null
}

const steps: Array<{ key: Exclude<ProcessingStage, "idle" | "error">; label: string }> = [
  { key: "upload", label: "Upload / receive input" },
  { key: "extract", label: "Extract audio with ffmpeg" },
  { key: "transcribe", label: "Transcribe speech" },
  { key: "translate", label: "Translate to Mongolian" },
  { key: "done", label: "Done" },
]

export function ProcessingStatus({ result }: ProcessingStatusProps) {
  const progress = typeof result?.progress === "number" ? result.progress : 0
  const currentStage = result?.stage || "idle"
  const logs = Array.isArray(result?.logs) ? result.logs : []
  const isProcessing = currentStage !== "idle" && currentStage !== "done" && currentStage !== "error"
  const hasResult = Boolean(result?.fullTranscript || result?.fullTranslation || (result?.segments?.length ?? 0) > 0)

  const isStepDone = (key: string) => {
    const order = ["upload", "extract", "transcribe", "translate", "done"]
    const currentIndex = order.indexOf(currentStage)
    const stepIndex = order.indexOf(key)
    if (currentStage === "error") return stepIndex < order.indexOf("done") && stepIndex <= Math.max(currentIndex, 0)
    if (currentIndex === -1) return false
    return stepIndex <= currentIndex
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Processing status</h2>
            <p className="text-sm text-stone-500">
              {result?.sourceName
                ? `Source: ${result.sourceName}`
                : "Upload a media file to generate transcript, natural Mongolian translation, and timed segments."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Progress</div>
            <div className="text-lg font-semibold text-stone-900">{progress}%</div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-stone-900 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="grid gap-3 sm:grid-cols-5">
          {steps.map((step) => {
            const done = isStepDone(step.key)
            const active = currentStage === step.key
            return (
              <div
                key={step.key}
                className={`rounded-2xl border px-3 py-3 text-sm ${
                  done
                    ? "border-stone-900 bg-stone-900 text-white"
                    : active
                      ? "border-amber-500 bg-amber-50 text-stone-900"
                      : "border-stone-200 bg-stone-50 text-stone-500"
                }`}
              >
                {step.label}
              </div>
            )
          })}
        </div>

        {!result ? (
          <div className="rounded-[24px] border border-dashed border-stone-300 bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2e7_100%)] p-5 text-sm leading-7 text-stone-600">
            Before processing starts, this workspace will guide the user through four clear outputs:
            transcript, natural Mongolian translation, timed segments, and line-by-line review for later dubbing work.
          </div>
        ) : null}

        {result?.detectedLanguage ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              Detected language: <span className="font-medium text-stone-900">{result.detectedLanguage}</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              Transcript lines: <span className="font-medium text-stone-900">{result.segments?.length ?? 0}</span>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
              State: <span className="font-medium text-stone-900">{result.stage}</span>
            </div>
          </div>
        ) : null}

        {result?.error ? (
          <div className="rounded-[24px] border border-red-200 bg-[linear-gradient(180deg,#fff9f9_0%,#fff1f1_100%)] px-4 py-4 text-sm whitespace-pre-wrap text-red-700">
            {result.error}
          </div>
        ) : null}

        <div className={`rounded-[24px] border p-4 ${isProcessing ? "border-amber-200 bg-amber-50" : hasResult ? "border-emerald-200 bg-emerald-50/60" : "border-stone-200 bg-stone-50"}`}>
          <div className="mb-2 text-sm font-medium text-stone-900">
            {isProcessing ? "Currently processing" : hasResult ? "Result ready" : "Waiting to start"}
          </div>
          <div className="text-sm leading-7 text-stone-600">
            {isProcessing
              ? "The UI stays focused on one clear pipeline: receive media, extract audio, transcribe, translate, then present a reviewable set of timed lines."
              : hasResult
                ? "The result panel on the right is ready for line-by-line review. The highlighted line can later become the anchor for dubbing controls."
                : "Use Upload File for the most reliable first-pass workflow. Paste URL remains available as a secondary option."}
          </div>
        </div>

        <div className="rounded-[24px] border border-stone-200 bg-stone-950 p-4">
          <div className="mb-3 text-sm font-medium text-stone-100">Status log</div>
          <div className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-stone-300">
            {logs.length > 0 ? logs.join("\n\n") : "No logs yet."}
          </div>
        </div>
      </div>
    </div>
  )
}
