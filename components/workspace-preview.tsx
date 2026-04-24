type WorkspacePreviewProps = {
  mediaName?: string
  sourceType?: string
  currentLine?: {
    start: number
    end: number
    sourceText: string
    mongolianText: string
    chosenVoiceName?: string
  } | null
  detectedLanguage?: string
  isProcessing?: boolean
  hasResult?: boolean
}

function formatTime(value?: number) {
  if (value === undefined || value === null) return "00:00.00"
  const totalMs = Math.round(value * 1000)
  const mins = Math.floor(totalMs / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)
  const ms = Math.floor((totalMs % 1000) / 10)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`
}

export function WorkspacePreview({
  mediaName,
  sourceType,
  currentLine,
  detectedLanguage,
  isProcessing,
  hasResult,
}: WorkspacePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Preview</div>
            <div className="mt-1 text-sm text-stone-600">
              {mediaName || "Your uploaded media will appear here"}
            </div>
          </div>
          <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
            {sourceType === "url" ? "Public URL" : "Upload-first"}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,#4c3826_0%,#171411_58%,#0f0d0b_100%)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(233,186,116,0.24),transparent_38%,rgba(255,255,255,0.04)_70%,transparent)]" />
            <div className="grid min-h-[320px] place-items-center px-5 py-6 sm:min-h-[440px]">
              <div className="w-full max-w-[240px] rounded-[32px] border border-white/10 bg-black/30 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
                <div className="aspect-[9/16] overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,#2c241d_0%,#12100e_100%)] p-4 text-white">
                  <div className="flex h-full flex-col justify-between">
                    <div className="space-y-3">
                      <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/80">
                        Vertical-friendly
                      </div>
                      <div className="text-2xl font-semibold leading-tight">
                        {hasResult ? "Ready for transcript review" : isProcessing ? "Preparing your workspace" : "Drop in a clip to begin"}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full rounded-full bg-amber-300 ${isProcessing ? "w-2/3 animate-pulse" : hasResult ? "w-full" : "w-1/4"}`} />
                      </div>
                      <div className="text-sm text-white/75">
                        {hasResult
                          ? "Transcript, natural Mongolian, and timed segments are aligned for line-by-line review."
                          : "Built for quick review now, with room for future dubbing controls later."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-black/30 px-4 py-3 text-sm text-white/75 sm:px-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {detectedLanguage ? `Detected: ${detectedLanguage}` : "Auto language detection"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1">Transcript + natural Mongolian</span>
                <span className="rounded-full bg-white/10 px-3 py-1">Timed review flow</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3 sm:px-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Current line</div>
          <div className="mt-1 text-sm text-stone-600">Focus on one timed segment at a time.</div>
        </div>

        {currentLine ? (
          <div className="space-y-4 p-4 sm:p-5">
            <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
              {formatTime(currentLine.start)} - {formatTime(currentLine.end)}
            </div>

            <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Original line</div>
              <p className="text-sm leading-7 text-stone-800">{currentLine.sourceText}</p>
            </div>

            {currentLine.chosenVoiceName ? (
              <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-700">
                Similar Mongolian voice: {currentLine.chosenVoiceName}
              </div>
            ) : null}

            <div className="rounded-[22px] border border-amber-200 bg-[linear-gradient(180deg,#fff8e8_0%,#fff2cf_100%)] p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">Natural spoken Mongolian</div>
              <p className="text-base leading-7 text-stone-950">{currentLine.mongolianText}</p>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="rounded-[22px] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-7 text-stone-600">
              {isProcessing
                ? "Processing is underway. The currently active subtitle line will appear here as soon as the first segments are ready."
                : "After processing, the currently focused subtitle line will appear here with the original text and its context-aware Mongolian version."}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
