import type { Energy, Emotion, SelectedVoiceProfile, Timbre, VoiceId } from "@/lib/voice-selector"
import type { DubbingSegment } from "@/lib/dubbing/prepare-dubbing-segments"

export type TtsRenderOptions = {
  speed: number
  pitchShift: number
  styleStrength: number
  emotionStrength: number
}

export type TtsProviderVoiceConfig = {
  baseVoiceId?: VoiceId
  timbre?: Timbre
  energy?: Energy
  emotion?: Emotion
}

export type TtsProviderPayloadItem = {
  segmentId: string
  text: string
  voice: TtsProviderVoiceConfig
  renderOptions: TtsRenderOptions
}

const DEFAULT_RENDER_OPTIONS: TtsRenderOptions = {
  speed: 1,
  pitchShift: 0,
  styleStrength: 0.55,
  emotionStrength: 0.45,
}

function mapVoiceSelectionToProviderVoice(
  voiceSelection?: Omit<SelectedVoiceProfile, "speakerId">
): TtsProviderVoiceConfig {
  if (!voiceSelection) {
    return {}
  }

  return {
    baseVoiceId: voiceSelection.baseVoiceId,
    timbre: voiceSelection.timbre,
    energy: voiceSelection.energy,
    emotion: voiceSelection.emotion,
  }
}

export function buildTtsProviderPayload(segments: DubbingSegment[]): TtsProviderPayloadItem[] {
  return segments.map((segment) => ({
    segmentId: segment.segmentId,
    text: segment.textForTts,
    voice: mapVoiceSelectionToProviderVoice(segment.voiceSelection),
    renderOptions: { ...DEFAULT_RENDER_OPTIONS },
  }))
}
