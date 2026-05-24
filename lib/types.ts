import type { SelectedVoiceProfile } from "@/lib/voice-selector"
import type { SpeakerVoiceTraits } from "@/lib/voice-matcher"
import type { AudioArtifacts } from "@/lib/audio-artifacts"
import type { RemixArtifacts } from "@/lib/remix-artifacts"

export type VoiceLibraryMatchDebug = {
  inputTraits: SpeakerVoiceTraits | null
  chosenVoiceId: string
  chosenVoiceName: string
  whyItWasChosen: string[]
  alternativeCandidates: Array<{
    id: string
    displayName: string
    score: number
  }>
}

export type ProcessingStage = "idle" | "upload" | "extract" | "transcribe" | "translate" | "done" | "error"

export type VoiceMatchSummary = {
  selectedVoices: Array<{
    id: string
    displayName: string
  }>
  providersUsed: string[]
  fallbackUsed: boolean
  candidateCount: number
  providerPreviewAvailable: boolean
}

export type SpeakerSummary = {
  speakerId: string
  segmentCount: number
}

export interface TranscriptSegment {
  start: number
  end: number
  sourceText: string
  mongolianText: string
  speakerId?: string
  emotion?: string
  intensity?: number
  power?: number
  speed?: number
  pitch?: number
  speechAct?: string
  pauseStyle?: "none" | "breath" | "dramatic" | "hesitation"
  voiceSelection?: Omit<SelectedVoiceProfile, "speakerId">
  chosenVoiceId?: string
  chosenVoiceName?: string
  chosenVoiceProvider?: string
  chosenVoiceReason?: string[]
  alternativeVoiceCandidates?: Array<{
    id: string
    displayName: string
    score: number
  }>
  voiceLibraryMatch?: VoiceLibraryMatchDebug
}

export interface ProcessingResult {
  success: boolean
  jobId?: string
  stage: ProcessingStage
  progress: number
  logs: string[]
  sourceName: string
  sourceType: "file" | "url" | ""
  detectedLanguage: string
  fullTranscript: string
  fullTranslation: string
  segments: TranscriptSegment[]
  speakerSummary?: SpeakerSummary[]
  voiceMatchSummary?: VoiceMatchSummary
  audioArtifacts?: AudioArtifacts
  remixArtifacts?: RemixArtifacts
  warnings?: string[]
  errorCode?: string
  error?: string
  message?: string
}
