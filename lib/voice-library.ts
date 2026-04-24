import type { VoiceId } from "@/lib/voice-selector"

export type VoiceLibraryProvider = "elevenlabs" | "fishaudio" | "cartesia" | "openvoice" | "custom"
export type VoiceLibraryGender = "female" | "male" | "child" | "neutral"
export type VoiceLibraryAgeGroup = "child" | "teen" | "young_adult" | "adult" | "mature" | "elder"
export type VoiceLibraryPitchProfile = "low" | "mid_low" | "mid" | "mid_high" | "high"
export type VoiceLibraryToneProfile = "soft" | "warm" | "bright" | "neutral" | "strong" | "deep" | "dry" | "cold"
export type VoiceLibraryEnergyProfile = "low" | "medium" | "high"
export type VoiceLibraryPaceProfile = "slow" | "medium" | "fast"

export type VoiceLibraryVoice = {
  id: string
  displayName: string
  provider: VoiceLibraryProvider
  providerVoiceId: string
  baseVoiceId?: VoiceId
  language: "mn"
  gender: VoiceLibraryGender
  ageGroup: VoiceLibraryAgeGroup
  pitchProfile: VoiceLibraryPitchProfile
  toneProfile: VoiceLibraryToneProfile
  energyProfile: VoiceLibraryEnergyProfile
  paceProfile: VoiceLibraryPaceProfile
  emotionRange: string[]
  archetypes: string[]
  useCases: string[]
  sampleTextMn: string
  enabled: boolean
  priority: number
  notes: string
}

const SAMPLE_TEXT = "Сайн байна уу. Энэ хоолой нь монгол дуббингийн туршилтын жишээ юм."

export const MONGOLIAN_VOICE_LIBRARY: VoiceLibraryVoice[] = [
  {
    id: "mn_young_female_soft_bright",
    displayName: "Young Female Soft Bright",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F3",
    baseVoiceId: "F3",
    language: "mn",
    gender: "female",
    ageGroup: "young_adult",
    pitchProfile: "mid_high",
    toneProfile: "soft",
    energyProfile: "medium",
    paceProfile: "medium",
    emotionRange: ["neutral", "caring", "happy"],
    archetypes: ["gentle lead", "warm friend", "vlog host"],
    useCases: ["dialogue", "vlog", "light drama"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 96,
    notes: "Balanced young female voice style for natural spoken Mongolian."
  },
  {
    id: "mn_warm_mother_drama",
    displayName: "Warm Mother Drama",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F4",
    baseVoiceId: "F4",
    language: "mn",
    gender: "female",
    ageGroup: "adult",
    pitchProfile: "mid",
    toneProfile: "warm",
    energyProfile: "medium",
    paceProfile: "slow",
    emotionRange: ["caring", "sad", "serious"],
    archetypes: ["warm mother", "family drama", "mentor"],
    useCases: ["film dialogue", "emotional scenes", "narration"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 95,
    notes: "Strong fit for emotional, believable family-oriented delivery."
  },
  {
    id: "mn_young_male_energetic",
    displayName: "Young Male Energetic",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M3",
    baseVoiceId: "M3",
    language: "mn",
    gender: "male",
    ageGroup: "young_adult",
    pitchProfile: "mid",
    toneProfile: "bright",
    energyProfile: "high",
    paceProfile: "fast",
    emotionRange: ["excited", "happy", "neutral"],
    archetypes: ["action lead", "energetic host", "young hero"],
    useCases: ["action", "comedy", "fast dialogue"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 94,
    notes: "Useful for youthful speed and confident momentum."
  },
  {
    id: "mn_adult_male_confident",
    displayName: "Adult Male Confident",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M4",
    baseVoiceId: "M4",
    language: "mn",
    gender: "male",
    ageGroup: "adult",
    pitchProfile: "mid_low",
    toneProfile: "strong",
    energyProfile: "medium",
    paceProfile: "medium",
    emotionRange: ["serious", "neutral", "excited"],
    archetypes: ["confident adult", "leader", "detective"],
    useCases: ["dialogue", "action", "narration"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 93,
    notes: "Steady confident male style for clean mainstream dubbing."
  },
  {
    id: "mn_child_playful",
    displayName: "Child Playful",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F1",
    baseVoiceId: "F1",
    language: "mn",
    gender: "child",
    ageGroup: "child",
    pitchProfile: "high",
    toneProfile: "bright",
    energyProfile: "high",
    paceProfile: "fast",
    emotionRange: ["happy", "excited", "neutral"],
    archetypes: ["playful child", "cartoon energy", "curious kid"],
    useCases: ["children", "animation", "light comedy"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 92,
    notes: "Child-like playful voicing for light or youthful scenes."
  },
  {
    id: "mn_teen_female_light_comedy",
    displayName: "Teen Female Light Comedy",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F2",
    baseVoiceId: "F2",
    language: "mn",
    gender: "female",
    ageGroup: "teen",
    pitchProfile: "mid_high",
    toneProfile: "bright",
    energyProfile: "high",
    paceProfile: "fast",
    emotionRange: ["happy", "excited", "neutral"],
    archetypes: ["comedy/light", "teen friend", "school life"],
    useCases: ["comedy", "social dialogue", "light scenes"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 91,
    notes: "Good for modern teen dialogue with lively rhythm."
  },
  {
    id: "mn_elder_male_dry_serious",
    displayName: "Elder Male Dry Serious",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M5",
    baseVoiceId: "M5",
    language: "mn",
    gender: "male",
    ageGroup: "elder",
    pitchProfile: "low",
    toneProfile: "dry",
    energyProfile: "low",
    paceProfile: "slow",
    emotionRange: ["serious", "neutral", "sad"],
    archetypes: ["elderly male", "strict elder", "serious veteran"],
    useCases: ["drama", "history", "dialogue"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 90,
    notes: "Dry elder male presence for serious scenes."
  },
  {
    id: "mn_narrator_clear_stable",
    displayName: "Narrator Clear Stable",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M4",
    baseVoiceId: "M4",
    language: "mn",
    gender: "neutral",
    ageGroup: "mature",
    pitchProfile: "mid_low",
    toneProfile: "neutral",
    energyProfile: "medium",
    paceProfile: "medium",
    emotionRange: ["neutral", "serious"],
    archetypes: ["announcer", "narrator", "documentary host"],
    useCases: ["documentary", "voice over", "announcements"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 98,
    notes: "Reliable neutral narrator with clear articulation."
  },
  {
    id: "mn_female_emotional_drama",
    displayName: "Female Emotional Drama",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F4",
    baseVoiceId: "F4",
    language: "mn",
    gender: "female",
    ageGroup: "mature",
    pitchProfile: "mid",
    toneProfile: "warm",
    energyProfile: "medium",
    paceProfile: "slow",
    emotionRange: ["sad", "caring", "serious"],
    archetypes: ["emotional drama", "mother", "tragic lead"],
    useCases: ["drama", "close-up dialogue", "melodrama"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 89,
    notes: "Emotion-heavy delivery without sounding theatrical."
  },
  {
    id: "mn_villain_cold_controlled",
    displayName: "Villain Cold Controlled",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M4",
    baseVoiceId: "M4",
    language: "mn",
    gender: "male",
    ageGroup: "mature",
    pitchProfile: "mid_low",
    toneProfile: "cold",
    energyProfile: "low",
    paceProfile: "slow",
    emotionRange: ["serious", "angry", "neutral"],
    archetypes: ["villain", "cold", "controlled"],
    useCases: ["thriller", "antagonist scenes", "dark drama"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 88,
    notes: "Controlled cold style suited to antagonists."
  },
  {
    id: "mn_action_male_drive",
    displayName: "Action Male Drive",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_M3",
    baseVoiceId: "M3",
    language: "mn",
    gender: "male",
    ageGroup: "adult",
    pitchProfile: "mid",
    toneProfile: "strong",
    energyProfile: "high",
    paceProfile: "fast",
    emotionRange: ["excited", "angry", "serious"],
    archetypes: ["action/energetic", "combat leader", "urgent hero"],
    useCases: ["action", "trailer", "intense dialogue"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 87,
    notes: "Punchier action voice style with urgency."
  },
  {
    id: "mn_documentary_neutral",
    displayName: "Neutral Documentary",
    provider: "elevenlabs",
    providerVoiceId: "ELEVENLABS_VOICE_ID_F3",
    baseVoiceId: "F3",
    language: "mn",
    gender: "neutral",
    ageGroup: "adult",
    pitchProfile: "mid",
    toneProfile: "neutral",
    energyProfile: "medium",
    paceProfile: "medium",
    emotionRange: ["neutral", "serious"],
    archetypes: ["neutral/documentary", "explainer", "educational"],
    useCases: ["documentary", "education", "voice over"],
    sampleTextMn: SAMPLE_TEXT,
    enabled: true,
    priority: 100,
    notes: "Safe neutral Mongolian fallback when no stronger match exists."
  }
]

export function getVoiceLibrary() {
  return MONGOLIAN_VOICE_LIBRARY
}

export function getVoiceLibraryById(id: string) {
  return MONGOLIAN_VOICE_LIBRARY.find((voice) => voice.id === id)
}

export function getNeutralFallbackVoice() {
  return getVoiceLibraryById("mn_documentary_neutral") || MONGOLIAN_VOICE_LIBRARY[0]
}
