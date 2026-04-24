import type { TranscriptSegment, VoiceLibraryMatchDebug } from "@/lib/types"
import type { SelectedVoiceProfile } from "@/lib/voice-selector"
import { matchVoiceToSpeaker, type SpeakerVoiceTraits } from "@/lib/voice-matcher"
import type { Emotion, Energy, Timbre } from "@/lib/voice-selector"

export type DubbingSegment = TranscriptSegment & {
  segmentId: string
  textForTts: string
  chosenVoiceId: string
  chosenVoiceName: string
  chosenVoiceProvider: string
  chosenVoiceReason: string[]
  alternativeVoiceCandidates: Array<{
    id: string
    displayName: string
    score: number
  }>
  voiceLibraryMatch: VoiceLibraryMatchDebug
}

export type PrepareDubbingOptions = {
  speakerTraitsByIndex?: Array<SpeakerVoiceTraits | undefined>
}

function createSegmentId(index: number) {
  return `seg_${String(index + 1).padStart(4, "0")}`
}

function mapToneToTimbre(tone: string): Timbre {
  if (tone === "soft") return "soft"
  if (tone === "bright") return "bright"
  if (tone === "warm") return "warm"
  if (tone === "deep") return "deep"
  if (tone === "dry") return "thin"
  if (tone === "cold") return "husky"
  return "warm"
}

function mapEnergy(value: string): Energy {
  if (value === "low" || value === "high") return value
  return "medium"
}

function mapEmotion(value?: string): Emotion {
  if (value === "happy" || value === "sad" || value === "angry" || value === "caring" || value === "excited" || value === "serious") {
    return value
  }
  return "neutral"
}

export function prepareDubbingSegments(
  segments: TranscriptSegment[],
  options: PrepareDubbingOptions = {}
): DubbingSegment[] {
  return segments.map((segment, index) => ({
    ...(function () {
      const segmentId = createSegmentId(index)
      const inputTraits = options.speakerTraitsByIndex?.[index] || null
      const match = matchVoiceToSpeaker(inputTraits || {})
      const inferredVoiceSelection = match.selectedVoice.baseVoiceId
        ? {
            baseVoiceId: match.selectedVoice.baseVoiceId,
            timbre: mapToneToTimbre(match.selectedVoice.toneProfile),
            energy: mapEnergy(match.selectedVoice.energyProfile),
            emotion: mapEmotion(match.selectedVoice.emotionRange[0]),
          }
        : undefined

      return {
        segmentId,
        start: segment.start,
        end: segment.end,
        sourceText: segment.sourceText,
        mongolianText: segment.mongolianText,
        textForTts: segment.mongolianText,
        voiceSelection: segment.voiceSelection ?? inferredVoiceSelection,
        chosenVoiceId: match.selectedVoice.id,
        chosenVoiceName: match.selectedVoice.displayName,
        chosenVoiceProvider: match.selectedVoice.provider,
        chosenVoiceReason: match.scoreBreakdown.reasons,
        alternativeVoiceCandidates: match.shortlist.map((candidate) => ({
          id: candidate.voice.id,
          displayName: candidate.voice.displayName,
          score: candidate.score,
        })),
        voiceLibraryMatch: {
          inputTraits,
          chosenVoiceId: match.selectedVoice.id,
          chosenVoiceName: match.selectedVoice.displayName,
          whyItWasChosen: match.scoreBreakdown.reasons,
          alternativeCandidates: match.shortlist.map((candidate) => ({
            id: candidate.voice.id,
            displayName: candidate.voice.displayName,
            score: candidate.score,
          })),
        },
      }
    })()
  }))
}
