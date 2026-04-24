import voiceBank from "@/config/mongolian-voice-bank.json"

export type AgeClass = "child" | "teen" | "young_adult" | "mature_adult" | "elder"
export type GenderClass = "female" | "male" | "ambiguous"
export type Timbre = "soft" | "bright" | "warm" | "deep" | "thin" | "husky"
export type Energy = "low" | "medium" | "high"
export type Emotion = "neutral" | "happy" | "sad" | "angry" | "caring" | "excited" | "serious"
export type VoiceId = "F1" | "F2" | "F3" | "F4" | "F5" | "M1" | "M2" | "M3" | "M4" | "M5"

export interface BaseVoice {
  voiceId: VoiceId
  code: string
  genderClass: Exclude<GenderClass, "ambiguous">
  ageClass: AgeClass
  displayName: string
  basePitch: number
  baseTimbre: Timbre
  baseEnergy: Energy
  defaultEmotion: Emotion
  description: string
}

export interface SpeakerAnalysis {
  speakerId: string
  estimatedAgeClass: AgeClass
  estimatedGenderClass: GenderClass
  timbreHint?: Timbre
  energyLevel?: Energy
  emotionState?: Emotion
}

export interface SelectedVoiceProfile {
  speakerId: string
  baseVoiceId: VoiceId
  timbre: Timbre
  energy: Energy
  emotion: Emotion
}

type VoiceBankFile = {
  version: string
  locale: string
  globalRules: {
    nativeRealism: boolean
    cleanPronunciation: boolean
    naturalSpokenMongolian: boolean
    avoidForeignAccent: boolean
    avoidWoodenReading: boolean
    avoidExaggeratedActing: boolean
    studioClean: boolean
  }
  baseVoices: BaseVoice[]
  controls: {
    timbre: Timbre[]
    energy: Energy[]
    emotion: Emotion[]
  }
  fallbacks: {
    unknown_female: { voiceId: VoiceId; code: string }
    unknown_male: { voiceId: VoiceId; code: string }
  }
}

const typedVoiceBank = voiceBank as VoiceBankFile

const VALID_TIMBRES: Timbre[] = ["soft", "bright", "warm", "deep", "thin", "husky"]
const VALID_ENERGY: Energy[] = ["low", "medium", "high"]
const VALID_EMOTIONS: Emotion[] = ["neutral", "happy", "sad", "angry", "caring", "excited", "serious"]

const VOICE_MAP: Record<`${AgeClass}_${Exclude<GenderClass, "ambiguous">}`, VoiceId> = {
  child_female: "F1",
  teen_female: "F2",
  young_adult_female: "F3",
  mature_adult_female: "F4",
  elder_female: "F5",
  child_male: "M1",
  teen_male: "M2",
  young_adult_male: "M3",
  mature_adult_male: "M4",
  elder_male: "M5",
}

const BASE_VOICE_BY_ID = new Map<VoiceId, BaseVoice>(
  typedVoiceBank.baseVoices.map((voice) => [voice.voiceId, voice])
)

function normalizeTimbre(value?: Timbre): Timbre {
  return value && VALID_TIMBRES.includes(value) ? value : "warm"
}

function normalizeEnergy(value?: Energy): Energy {
  return value && VALID_ENERGY.includes(value) ? value : "medium"
}

function normalizeEmotion(value?: Emotion): Emotion {
  return value && VALID_EMOTIONS.includes(value) ? value : "neutral"
}

function getFallbackVoiceId(ageClass: AgeClass): VoiceId {
  if (ageClass === "child") return "F1"
  if (ageClass === "teen") return "F2"
  if (ageClass === "elder") return "F5"
  return "F3"
}

function resolveBaseVoiceId(input: SpeakerAnalysis): VoiceId {
  if (input.estimatedGenderClass === "ambiguous") {
    return getFallbackVoiceId(input.estimatedAgeClass)
  }

  const mappedVoiceId = VOICE_MAP[`${input.estimatedAgeClass}_${input.estimatedGenderClass}`]
  return mappedVoiceId || getFallbackVoiceId(input.estimatedAgeClass)
}

export function getMongolianVoiceBank() {
  return typedVoiceBank
}

export function getBaseVoiceById(voiceId: VoiceId): BaseVoice {
  const baseVoice = BASE_VOICE_BY_ID.get(voiceId)
  if (!baseVoice) {
    throw new Error(`Unknown Mongolian base voice: ${voiceId}`)
  }
  return baseVoice
}

export function selectMongolianVoice(input: SpeakerAnalysis): SelectedVoiceProfile {
  const baseVoiceId = resolveBaseVoiceId(input)
  const baseVoice = getBaseVoiceById(baseVoiceId)

  return {
    speakerId: input.speakerId,
    baseVoiceId,
    timbre: normalizeTimbre(input.timbreHint ?? baseVoice.baseTimbre),
    energy: normalizeEnergy(input.energyLevel ?? baseVoice.baseEnergy),
    emotion: normalizeEmotion(input.emotionState ?? baseVoice.defaultEmotion),
  }
}
