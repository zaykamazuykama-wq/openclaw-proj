import type { TranscriptSegment } from "@/lib/types"

export function generateMockTranscript(): TranscriptSegment[] {
  return [
    {
      start: 0,
      end: 3.5,
      sourceText: "This is a placeholder segment.",
      mongolianText: "Энэ бол жишээ мөр.",
    },
  ]
}
