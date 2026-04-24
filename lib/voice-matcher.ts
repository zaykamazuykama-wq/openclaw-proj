import {
  getNeutralFallbackVoice,
  getVoiceLibrary,
  type VoiceLibraryAgeGroup,
  type VoiceLibraryEnergyProfile,
  type VoiceLibraryGender,
  type VoiceLibraryPaceProfile,
  type VoiceLibraryPitchProfile,
  type VoiceLibraryToneProfile,
  type VoiceLibraryVoice,
} from "@/lib/voice-library"

export type SpeakerVoiceTraits = {
  detectedGender?: VoiceLibraryGender
  detectedAgeGroup?: VoiceLibraryAgeGroup
  detectedPitch?: VoiceLibraryPitchProfile
  detectedTone?: VoiceLibraryToneProfile
  detectedEnergy?: VoiceLibraryEnergyProfile
  detectedSpeechRate?: VoiceLibraryPaceProfile
  detectedEmotion?: string
  characterLabel?: string
}

export type VoiceMatchScoreBreakdown = {
  gender: number
  age: number
  pitch: number
  tone: number
  energy: number
  pace: number
  emotion: number
  archetype: number
  total: number
  reasons: string[]
}

export type VoiceMatchCandidate = {
  voice: VoiceLibraryVoice
  score: number
  scoreBreakdown: VoiceMatchScoreBreakdown
}

export type VoiceMatchResult = {
  selectedVoice: VoiceLibraryVoice
  shortlist: VoiceMatchCandidate[]
  scoreBreakdown: VoiceMatchScoreBreakdown
}

const AGE_ORDER: VoiceLibraryAgeGroup[] = ["child", "teen", "young_adult", "adult", "mature", "elder"]

function normalizeValue(value?: string) {
  return (value || "").trim().toLowerCase()
}

function scoreAgeMatch(inputAge: VoiceLibraryAgeGroup, voiceAge: VoiceLibraryAgeGroup) {
  const inputIndex = AGE_ORDER.indexOf(inputAge)
  const voiceIndex = AGE_ORDER.indexOf(voiceAge)
  const distance = Math.abs(inputIndex - voiceIndex)
  if (distance === 0) return 20
  if (distance === 1) return 12
  if (distance === 2) return 5
  return 0
}

function scoreVoice(voice: VoiceLibraryVoice, input: SpeakerVoiceTraits): VoiceMatchCandidate {
  const reasons: string[] = []
  let gender = 0
  let age = 0
  let pitch = 0
  let tone = 0
  let energy = 0
  let pace = 0
  let emotion = 0
  let archetype = 0

  if (input.detectedGender) {
    if (voice.gender === input.detectedGender) {
      gender = 40
      reasons.push("Exact gender match")
    } else if (voice.gender === "neutral" || input.detectedGender === "neutral") {
      gender = 12
      reasons.push("Neutral gender fallback")
    } else if (input.detectedGender === "child" && voice.ageGroup === "child") {
      gender = 24
      reasons.push("Child voice fallback")
    }
  }

  if (input.detectedAgeGroup) {
    age = scoreAgeMatch(input.detectedAgeGroup, voice.ageGroup)
    if (age > 0) reasons.push(age >= 20 ? "Exact age group match" : "Close age group match")
  }

  if (input.detectedPitch && input.detectedPitch === voice.pitchProfile) {
    pitch = 12
    reasons.push("Pitch profile match")
  }

  if (input.detectedTone && input.detectedTone === voice.toneProfile) {
    tone = 12
    reasons.push("Tone profile match")
  }

  if (input.detectedEnergy && input.detectedEnergy === voice.energyProfile) {
    energy = 12
    reasons.push("Energy profile match")
  }

  if (input.detectedSpeechRate && input.detectedSpeechRate === voice.paceProfile) {
    pace = 10
    reasons.push("Speech pace match")
  }

  const emotionValue = normalizeValue(input.detectedEmotion)
  if (emotionValue && voice.emotionRange.some((item) => normalizeValue(item) === emotionValue)) {
    emotion = 8
    reasons.push("Emotion range overlap")
  }

  const archetypeValue = normalizeValue(input.characterLabel)
  if (
    archetypeValue &&
    [...voice.archetypes, ...voice.useCases].some((item) => normalizeValue(item).includes(archetypeValue))
  ) {
    archetype = 10
    reasons.push("Character archetype overlap")
  }

  const total = gender + age + pitch + tone + energy + pace + emotion + archetype

  return {
    voice,
    score: total,
    scoreBreakdown: {
      gender,
      age,
      pitch,
      tone,
      energy,
      pace,
      emotion,
      archetype,
      total,
      reasons,
    },
  }
}

export function matchVoiceToSpeaker(
  input: SpeakerVoiceTraits = {},
  voices: VoiceLibraryVoice[] = getVoiceLibrary()
): VoiceMatchResult {
  const enabledVoices = voices.filter((voice) => voice.enabled)
  const candidates = (enabledVoices.length > 0 ? enabledVoices : voices)
    .map((voice) => scoreVoice(voice, input))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (b.voice.priority !== a.voice.priority) return b.voice.priority - a.voice.priority
      return a.voice.id.localeCompare(b.voice.id)
    })

  const neutralFallback = getNeutralFallbackVoice()
  const selectedCandidate =
    candidates[0] && candidates[0].score > 0
      ? candidates[0]
      : candidates.find((candidate) => candidate.voice.id === neutralFallback.id) || candidates[0]

  if (!selectedCandidate) {
    const fallbackVoice = neutralFallback
    return {
      selectedVoice: fallbackVoice,
      shortlist: [
        {
          voice: fallbackVoice,
          score: 0,
          scoreBreakdown: {
            gender: 0,
            age: 0,
            pitch: 0,
            tone: 0,
            energy: 0,
            pace: 0,
            emotion: 0,
            archetype: 0,
            total: 0,
            reasons: ["Neutral Mongolian fallback"],
          },
        },
      ],
      scoreBreakdown: {
        gender: 0,
        age: 0,
        pitch: 0,
        tone: 0,
        energy: 0,
        pace: 0,
        emotion: 0,
        archetype: 0,
        total: 0,
        reasons: ["Neutral Mongolian fallback"],
      },
    }
  }

  if (selectedCandidate.score === 0 && !selectedCandidate.scoreBreakdown.reasons.includes("Neutral Mongolian fallback")) {
    selectedCandidate.scoreBreakdown.reasons.push("Neutral Mongolian fallback")
  }

  return {
    selectedVoice: selectedCandidate.voice,
    shortlist: candidates.slice(0, 5),
    scoreBreakdown: selectedCandidate.scoreBreakdown,
  }
}
