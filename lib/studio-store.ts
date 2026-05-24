import fs from "fs"
import os from "os"
import path from "path"
import voiceBank from "@/config/mongolian-voice-bank.json"
import type { ProcessingResult } from "@/lib/types"
import type { RemixMode } from "@/lib/remix-artifacts"

type ProjectStatus = "created" | "uploading" | "analyzing" | "ready" | "rendering" | "rendered" | "failed"
type MediaKind = "source" | "render_draft" | "render_final" | "stem"
type RenderQuality = "draft" | "final"
type RenderStatus = "queued" | "running" | "done" | "failed"
type RenderEngine = "elevenlabs" | "piper"

export type StudioProjectRecord = {
  id: string
  title: string
  source_lang: string
  target_lang: string
  status: ProjectStatus
  pipeline_stage?: ProcessingResult["stage"]
  pipeline_progress?: number
  duration_sec?: number
  source_name?: string
  source_type?: ProcessingResult["sourceType"]
  remix_mode?: RemixMode
  mixed_audio_path?: string
  replacement_music_path?: string
  final_video_path?: string
  export_ready?: boolean
  created_at: string
  updated_at: string
}

export type StudioMediaFileRecord = {
  id: string
  project_id: string
  kind: MediaKind
  storage_key: string
  mime_type: string
  bytes?: number
  created_at: string
}

export type StudioVoiceRecord = {
  id: string
  display_name: string
  gender: "female" | "male"
  age_feel: "young" | "adult" | "mature"
  warmth: number
  brightness: number
  softness: number
  energy: number
  best_for?: string
  piper_model?: string
  elevenlabs_voice_id?: string
  sample_url?: string
}

export type StudioCharacterRecord = {
  id: string
  project_id: string
  name: string
  speaker_color: number
  source_label: string
  traits: string[]
  voice_id?: string
  segment_count: number
  total_seconds: number
  created_at: string
}

export type StudioSegmentRecord = {
  id: string
  project_id: string
  character_id?: string
  idx: number
  start_sec: number
  end_sec: number
  source_text: string
  literal_mn?: string
  spoken_mn?: string
  speaker_id?: string
  voice_id?: string
  voice_name?: string
  emotion?: string
  intensity?: number
  power?: number
  speed?: number
  pitch?: number
  speech_act?: string
  pause_style?: "none" | "breath" | "dramatic" | "hesitation"
  rendered_clip_key?: string
  rendered_at?: string
  created_at: string
}

export type StudioRenderJobRecord = {
  id: string
  project_id: string
  quality: RenderQuality
  tts_engine: RenderEngine
  status: RenderStatus
  progress: number
  output_key?: string
  error?: string
  started_at?: string
  finished_at?: string
  created_at: string
}

type StudioData = {
  projects: StudioProjectRecord[]
  media_files: StudioMediaFileRecord[]
  voices: StudioVoiceRecord[]
  characters: StudioCharacterRecord[]
  segments: StudioSegmentRecord[]
  render_jobs: StudioRenderJobRecord[]
}

type VoiceBankFile = {
  baseVoices: Array<{
    voiceId: string
    code: string
    genderClass: "female" | "male"
    ageClass: "child" | "teen" | "young_adult" | "mature_adult" | "elder"
    displayName: string
    baseTimbre: "soft" | "bright" | "warm" | "deep" | "thin" | "husky"
    baseEnergy: "low" | "medium" | "high"
    description: string
  }>
}

const typedVoiceBank = voiceBank as VoiceBankFile

const STUDIO_DATA_PATH = path.join(os.tmpdir(), "movie-tra", "studio-data.json")
const RUNS_DIR = path.join(os.tmpdir(), "movie-tra", "runs")

function emptyStudioData(): StudioData {
  return {
    projects: [],
    media_files: [],
    voices: [],
    characters: [],
    segments: [],
    render_jobs: [],
  }
}

function nowIso() {
  return new Date().toISOString()
}

function ageClassToFeel(ageClass: VoiceBankFile["baseVoices"][number]["ageClass"]): StudioVoiceRecord["age_feel"] {
  if (ageClass === "mature_adult") return "adult"
  if (ageClass === "elder") return "mature"
  return "young"
}

function timbreToScores(timbre: VoiceBankFile["baseVoices"][number]["baseTimbre"]) {
  switch (timbre) {
    case "soft":
      return { warmth: 74, brightness: 58, softness: 92 }
    case "bright":
      return { warmth: 54, brightness: 88, softness: 64 }
    case "warm":
      return { warmth: 90, brightness: 52, softness: 70 }
    case "deep":
      return { warmth: 72, brightness: 28, softness: 42 }
    case "thin":
      return { warmth: 38, brightness: 60, softness: 36 }
    case "husky":
      return { warmth: 68, brightness: 34, softness: 48 }
    default:
      return { warmth: 60, brightness: 60, softness: 60 }
  }
}

function energyToScore(energy: VoiceBankFile["baseVoices"][number]["baseEnergy"]) {
  if (energy === "high") return 85
  if (energy === "low") return 35
  return 60
}

function getSeedVoices(): StudioVoiceRecord[] {
  return typedVoiceBank.baseVoices.map((voice) => {
    const timbreScores = timbreToScores(voice.baseTimbre)
    return {
      id: voice.voiceId,
      display_name: voice.displayName,
      gender: voice.genderClass,
      age_feel: ageClassToFeel(voice.ageClass),
      warmth: timbreScores.warmth,
      brightness: timbreScores.brightness,
      softness: timbreScores.softness,
      energy: energyToScore(voice.baseEnergy),
      best_for: voice.description,
      piper_model: `${voice.code}.onnx`,
      elevenlabs_voice_id: `ELEVENLABS_VOICE_ID_${voice.voiceId}`,
    }
  })
}

function getSeedVoiceDisplayName(voices: StudioVoiceRecord[], voiceId?: string) {
  if (!voiceId) return undefined
  return voices.find((voice) => voice.id === voiceId)?.display_name
}

function readStudioDataRaw(): StudioData {
  if (!fs.existsSync(STUDIO_DATA_PATH)) {
    return emptyStudioData()
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STUDIO_DATA_PATH, "utf-8")) as Partial<StudioData>
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      media_files: Array.isArray(parsed.media_files) ? parsed.media_files : [],
      voices: Array.isArray(parsed.voices) ? parsed.voices : [],
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      segments: Array.isArray(parsed.segments) ? parsed.segments : [],
      render_jobs: Array.isArray(parsed.render_jobs) ? parsed.render_jobs : [],
    }
  } catch {
    return emptyStudioData()
  }
}

function writeStudioData(data: StudioData) {
  fs.mkdirSync(path.dirname(STUDIO_DATA_PATH), { recursive: true })
  fs.writeFileSync(STUDIO_DATA_PATH, JSON.stringify(data, null, 2), "utf-8")
}

function upsertById<T extends { id: string }>(items: T[], nextItem: T) {
  const index = items.findIndex((item) => item.id === nextItem.id)
  if (index >= 0) {
    items[index] = nextItem
  } else {
    items.push(nextItem)
  }
}

function mimeFromExtension(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  if (extension === ".mp4") return "video/mp4"
  if (extension === ".mov") return "video/quicktime"
  if (extension === ".mkv") return "video/x-matroska"
  if (extension === ".webm") return "video/webm"
  if (extension === ".mp3") return "audio/mpeg"
  if (extension === ".wav") return "audio/wav"
  if (extension === ".m4a") return "audio/mp4"
  return "application/octet-stream"
}

function fileBytes(filePath?: string) {
  if (!filePath || !fs.existsSync(filePath)) return undefined
  try {
    return fs.statSync(filePath).size
  } catch {
    return undefined
  }
}

function inferProjectStatus(result: ProcessingResult): ProjectStatus {
  if (result.error) return "failed"
  if (result.remixArtifacts?.finalVideoPath) return "rendered"
  if (result.stage && result.stage !== "done" && result.stage !== "error") return "analyzing"
  if (result.stage === "error") return "failed"
  return "ready"
}

function inferDuration(result: ProcessingResult) {
  return result.segments.reduce((maxEnd, segment) => Math.max(maxEnd, segment.end || 0), 0)
}

function inferSpeakerSummary(result: ProcessingResult) {
  if (Array.isArray(result.speakerSummary) && result.speakerSummary.length > 0) {
    return result.speakerSummary
  }

  const counts = new Map<string, number>()
  for (const segment of result.segments) {
    const speakerId = segment.speakerId || "spk_01"
    counts.set(speakerId, (counts.get(speakerId) || 0) + 1)
  }

  return Array.from(counts.entries()).map(([speakerId, segmentCount]) => ({ speakerId, segmentCount }))
}

function inferRenderEngine(result: ProcessingResult): RenderEngine {
  const hasElevenLabs = result.segments.some((segment) => segment.chosenVoiceProvider === "elevenlabs")
  return hasElevenLabs ? "elevenlabs" : "piper"
}

function syncResultIntoData(data: StudioData, projectId: string, result: ProcessingResult) {
  const timestamp = nowIso()
  const runDir = path.join(RUNS_DIR, projectId)
  const duration = inferDuration(result)
  const existingCharactersById = new Map(
    data.characters
      .filter((character) => character.project_id === projectId)
      .map((character) => [character.id, character])
  )
  const existingSegmentsById = new Map(
    data.segments
      .filter((segment) => segment.project_id === projectId)
      .map((segment) => [segment.id, segment])
  )

  const existingProject = data.projects.find((project) => project.id === projectId)
  upsertById(data.projects, {
    id: projectId,
    title: result.sourceName || existingProject?.title || `Project ${projectId.slice(0, 8)}`,
    source_lang: result.detectedLanguage || existingProject?.source_lang || "auto",
    target_lang: "mn",
    status: inferProjectStatus(result),
    pipeline_stage: result.stage || existingProject?.pipeline_stage,
    pipeline_progress:
      typeof result.progress === "number" ? result.progress : existingProject?.pipeline_progress,
    duration_sec: duration || existingProject?.duration_sec,
    source_name: result.sourceName,
    source_type: result.sourceType,
    remix_mode: result.remixArtifacts?.mode || existingProject?.remix_mode,
    mixed_audio_path: result.remixArtifacts?.mixedAudioPath || existingProject?.mixed_audio_path,
    replacement_music_path:
      result.remixArtifacts?.replacementMusicPath || existingProject?.replacement_music_path,
    final_video_path: result.remixArtifacts?.finalVideoPath || existingProject?.final_video_path,
    export_ready:
      result.remixArtifacts?.exportReady ??
      existingProject?.export_ready ??
      Boolean(result.remixArtifacts?.mixedAudioPath || result.remixArtifacts?.finalVideoPath),
    created_at: existingProject?.created_at || timestamp,
    updated_at: timestamp,
  })

  const sourcePath = result.sourceName ? path.join(runDir, result.sourceName) : undefined
  if (sourcePath) {
    upsertById(data.media_files, {
      id: `${projectId}:source`,
      project_id: projectId,
      kind: "source",
      storage_key: sourcePath,
      mime_type: mimeFromExtension(sourcePath),
      bytes: fileBytes(sourcePath),
      created_at: timestamp,
    })
  }

  const stemPaths = [
    result.audioArtifacts?.dialogueStemPath,
    result.audioArtifacts?.backgroundStemPath,
    result.audioArtifacts?.musicStemPath,
    result.audioArtifacts?.ambienceStemPath,
  ].filter((value): value is string => Boolean(value))

  for (const stemPath of stemPaths) {
    upsertById(data.media_files, {
      id: `${projectId}:stem:${path.basename(stemPath)}`,
      project_id: projectId,
      kind: "stem",
      storage_key: stemPath,
      mime_type: mimeFromExtension(stemPath),
      bytes: fileBytes(stemPath),
      created_at: timestamp,
    })
  }

  if (result.remixArtifacts?.mixedAudioPath) {
    upsertById(data.media_files, {
      id: `${projectId}:render:draft`,
      project_id: projectId,
      kind: "render_draft",
      storage_key: result.remixArtifacts.mixedAudioPath,
      mime_type: mimeFromExtension(result.remixArtifacts.mixedAudioPath),
      bytes: fileBytes(result.remixArtifacts.mixedAudioPath),
      created_at: timestamp,
    })

    upsertById(data.render_jobs, {
      id: `${projectId}:render-job:draft`,
      project_id: projectId,
      quality: "draft",
      tts_engine: inferRenderEngine(result),
      status: "done",
      progress: 100,
      output_key: result.remixArtifacts.mixedAudioPath,
      created_at: timestamp,
      started_at: timestamp,
      finished_at: timestamp,
    })
  }

  if (result.remixArtifacts?.finalVideoPath) {
    upsertById(data.media_files, {
      id: `${projectId}:render:final`,
      project_id: projectId,
      kind: "render_final",
      storage_key: result.remixArtifacts.finalVideoPath,
      mime_type: mimeFromExtension(result.remixArtifacts.finalVideoPath),
      bytes: fileBytes(result.remixArtifacts.finalVideoPath),
      created_at: timestamp,
    })

    upsertById(data.render_jobs, {
      id: `${projectId}:render-job:final`,
      project_id: projectId,
      quality: "final",
      tts_engine: inferRenderEngine(result),
      status: "done",
      progress: 100,
      output_key: result.remixArtifacts.finalVideoPath,
      created_at: timestamp,
      started_at: timestamp,
      finished_at: timestamp,
    })
  }

  const nextCharacters: StudioCharacterRecord[] = []
  const nextSegments: StudioSegmentRecord[] = []
  const speakerSummary = inferSpeakerSummary(result)
  const colorBySpeakerId = new Map<string, number>()

  speakerSummary.forEach((speaker, index) => {
    colorBySpeakerId.set(speaker.speakerId, (index % 5) + 1)
  })

  for (const [index, segment] of result.segments.entries()) {
    const speakerId = segment.speakerId || "spk_01"
    const characterId = `${projectId}:character:${speakerId}`
    const existingStoredCharacter = existingCharactersById.get(characterId)
    const existingCharacter = nextCharacters.find((character) => character.id === characterId)
    const segmentSeconds = Math.max(0, (segment.end || 0) - (segment.start || 0))
    const derivedVoiceId = segment.voiceSelection?.baseVoiceId || segment.chosenVoiceId

    if (existingCharacter) {
      existingCharacter.segment_count += 1
      existingCharacter.total_seconds += segmentSeconds
      if (!existingCharacter.voice_id && (existingStoredCharacter?.voice_id || derivedVoiceId)) {
        existingCharacter.voice_id = existingStoredCharacter?.voice_id || derivedVoiceId
      }
    } else {
      nextCharacters.push({
        id: characterId,
        project_id: projectId,
        name: existingStoredCharacter?.name || `Character ${nextCharacters.length + 1}`,
        speaker_color: existingStoredCharacter?.speaker_color || colorBySpeakerId.get(speakerId) || ((nextCharacters.length % 5) + 1),
        source_label: speakerId,
        traits: existingStoredCharacter?.traits || [],
        voice_id: existingStoredCharacter?.voice_id || derivedVoiceId,
        segment_count: 1,
        total_seconds: segmentSeconds,
        created_at: existingStoredCharacter?.created_at || timestamp,
      })
    }

    const segmentId = `${projectId}:segment:${String(index + 1).padStart(4, "0")}`
    const existingStoredSegment = existingSegmentsById.get(segmentId)
    const effectiveVoiceId = existingStoredCharacter?.voice_id || existingStoredSegment?.voice_id || derivedVoiceId

    nextSegments.push({
      id: segmentId,
      project_id: projectId,
      character_id: characterId,
      idx: index,
      start_sec: segment.start,
      end_sec: segment.end,
      source_text: segment.sourceText,
      literal_mn: existingStoredSegment?.literal_mn,
      spoken_mn: existingStoredSegment?.spoken_mn ?? segment.mongolianText,
      speaker_id: speakerId,
      voice_id: effectiveVoiceId,
      voice_name: getSeedVoiceDisplayName(data.voices, effectiveVoiceId) || existingStoredSegment?.voice_name || segment.chosenVoiceName,
      emotion: existingStoredSegment?.emotion ?? segment.emotion,
      intensity: existingStoredSegment?.intensity ?? segment.intensity,
      power: existingStoredSegment?.power ?? segment.power,
      speed: existingStoredSegment?.speed ?? segment.speed,
      pitch: existingStoredSegment?.pitch ?? segment.pitch,
      speech_act: existingStoredSegment?.speech_act ?? segment.speechAct,
      pause_style: existingStoredSegment?.pause_style ?? segment.pauseStyle,
      rendered_clip_key: existingStoredSegment?.rendered_clip_key,
      rendered_at: existingStoredSegment?.rendered_at,
      created_at: existingStoredSegment?.created_at || timestamp,
    })
  }

  data.characters = data.characters.filter((character) => character.project_id !== projectId).concat(nextCharacters)
  data.segments = data.segments.filter((segment) => segment.project_id !== projectId).concat(nextSegments)
}

function backfillFromJobResults(data: StudioData) {
  if (!fs.existsSync(RUNS_DIR)) {
    return
  }

  const runEntries = fs.readdirSync(RUNS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory())
  for (const entry of runEntries) {
    const resultPath = path.join(RUNS_DIR, entry.name, "job-result.json")
    if (!fs.existsSync(resultPath)) continue

    try {
      const result = JSON.parse(fs.readFileSync(resultPath, "utf-8")) as ProcessingResult
      if (result && Array.isArray(result.segments)) {
        syncResultIntoData(data, entry.name, result)
      }
    } catch {
      continue
    }
  }
}

function getSyncedStudioData() {
  const data = readStudioDataRaw()
  data.voices = getSeedVoices()
  backfillFromJobResults(data)
  writeStudioData(data)
  return data
}

export function syncProcessingResultToStudio(projectId: string, result: ProcessingResult) {
  const data = readStudioDataRaw()
  data.voices = getSeedVoices()
  syncResultIntoData(data, projectId, result)
  writeStudioData(data)
}

export function listStudioProjects() {
  const data = getSyncedStudioData()
  return data.projects
    .map((project) => ({
      ...project,
      media_count: data.media_files.filter((item) => item.project_id === project.id).length,
      character_count: data.characters.filter((item) => item.project_id === project.id).length,
      segment_count: data.segments.filter((item) => item.project_id === project.id).length,
      render_job_count: data.render_jobs.filter((item) => item.project_id === project.id).length,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export function getStudioProjectBundle(projectId: string) {
  const data = getSyncedStudioData()
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) return undefined

  return {
    project,
    media_files: data.media_files.filter((item) => item.project_id === projectId),
    characters: data.characters.filter((item) => item.project_id === projectId),
    segments: data.segments
      .filter((item) => item.project_id === projectId)
      .sort((a, b) => a.idx - b.idx),
    render_jobs: data.render_jobs.filter((item) => item.project_id === projectId),
  }
}

export function listStudioVoices() {
  return getSyncedStudioData().voices
}

export function updateStudioProject(
  projectId: string,
  updates: { title?: string }
) {
  const data = getSyncedStudioData()
  const projectIndex = data.projects.findIndex((item) => item.id === projectId)
  if (projectIndex < 0) return undefined

  const currentProject = data.projects[projectIndex]
  const trimmedTitle = updates.title?.trim()

  data.projects[projectIndex] = {
    ...currentProject,
    title: trimmedTitle || currentProject.title,
    updated_at: nowIso(),
  }

  writeStudioData(data)
  return getStudioProjectBundle(projectId)
}

export function updateStudioCharacter(
  projectId: string,
  characterId: string,
  updates: { name?: string; voice_id?: string | null }
) {
  const data = getSyncedStudioData()
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) return undefined

  const characterIndex = data.characters.findIndex(
    (character) => character.id === characterId && character.project_id === projectId
  )
  if (characterIndex < 0) return undefined

  const currentCharacter = data.characters[characterIndex]
  const trimmedName = updates.name?.trim()
  const nextVoiceId = updates.voice_id?.trim() || undefined

  data.characters[characterIndex] = {
    ...currentCharacter,
    name: trimmedName || currentCharacter.name,
    voice_id: nextVoiceId,
  }

  const voiceName = getSeedVoiceDisplayName(data.voices, nextVoiceId)
  data.segments = data.segments.map((segment) =>
    segment.project_id === projectId && segment.character_id === characterId
      ? {
          ...segment,
          voice_id: nextVoiceId,
          voice_name: voiceName,
        }
      : segment
  )

  data.projects = data.projects.map((item) =>
    item.id === projectId
      ? {
          ...item,
          updated_at: nowIso(),
        }
      : item
  )

  writeStudioData(data)
  return getStudioProjectBundle(projectId)
}

export function updateStudioSegment(
  projectId: string,
  segmentId: string,
  updates: {
    spoken_mn?: string
    emotion?: string | null
    intensity?: number | null
    power?: number | null
    speed?: number | null
    pitch?: number | null
    speech_act?: string | null
    pause_style?: StudioSegmentRecord["pause_style"] | null
  }
) {
  const data = getSyncedStudioData()
  const project = data.projects.find((item) => item.id === projectId)
  if (!project) return undefined

  const segmentIndex = data.segments.findIndex(
    (segment) => segment.id === segmentId && segment.project_id === projectId
  )
  if (segmentIndex < 0) return undefined

  const currentSegment = data.segments[segmentIndex]
  const trimmedSpoken = updates.spoken_mn?.trim()
  const trimmedEmotion = updates.emotion?.trim()
  const trimmedSpeechAct = updates.speech_act?.trim()

  data.segments[segmentIndex] = {
    ...currentSegment,
    spoken_mn: trimmedSpoken ?? currentSegment.spoken_mn,
    emotion:
      updates.emotion === undefined ? currentSegment.emotion : trimmedEmotion || undefined,
    intensity:
      updates.intensity === undefined ? currentSegment.intensity : updates.intensity ?? undefined,
    power: updates.power === undefined ? currentSegment.power : updates.power ?? undefined,
    speed: updates.speed === undefined ? currentSegment.speed : updates.speed ?? undefined,
    pitch: updates.pitch === undefined ? currentSegment.pitch : updates.pitch ?? undefined,
    speech_act:
      updates.speech_act === undefined ? currentSegment.speech_act : trimmedSpeechAct || undefined,
    pause_style:
      updates.pause_style === undefined ? currentSegment.pause_style : updates.pause_style ?? undefined,
  }

  data.projects = data.projects.map((item) =>
    item.id === projectId
      ? {
          ...item,
          updated_at: nowIso(),
        }
      : item
  )

  writeStudioData(data)
  return getStudioProjectBundle(projectId)
}
