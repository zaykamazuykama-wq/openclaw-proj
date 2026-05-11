"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { VideoUpload } from "@/components/video-upload"
import { ProcessingStatus } from "@/components/processing-status"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"
import TranscriptView from "@/components/transcript-view"
import { WorkspacePreview } from "@/components/workspace-preview"
import { Button } from "@/components/ui/button"
import type { ProcessingResult, ProcessingStage } from "@/lib/types"
import type { RemixMode } from "@/lib/remix-artifacts"
import { Globe2, RotateCcw } from "lucide-react"

type StudioProjectSummary = {
  id: string
  title: string
  status: string
  duration_sec?: number
  source_name?: string
  source_type?: ProcessingResult["sourceType"]
  updated_at: string
  media_count: number
  character_count: number
  segment_count: number
  render_job_count: number
}

type StudioProjectRecord = {
  id: string
  title: string
  status: string
  source_lang?: string
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
  updated_at: string
}

type StudioVoiceSeed = {
  id: string
  display_name: string
  gender: "female" | "male"
  age_feel: "young" | "adult" | "mature"
}

type StudioProjectBundle = {
  project: StudioProjectRecord
  media_files: Array<{
    id: string
    kind: "source" | "render_draft" | "render_final" | "stem"
    storage_key: string
    mime_type: string
  }>
  characters: Array<{
    id: string
    name: string
    source_label: string
    voice_id?: string
    segment_count: number
    total_seconds: number
  }>
  segments: Array<{
    id: string
    idx: number
    character_id?: string
    speaker_id?: string
    start_sec: number
    end_sec: number
    source_text: string
    spoken_mn?: string
    voice_id?: string
    voice_name?: string
    emotion?: string
    intensity?: number
    power?: number
    speed?: number
    pitch?: number
    speech_act?: string
    pause_style?: "none" | "breath" | "dramatic" | "hesitation"
  }>
  render_jobs: Array<{
    id: string
    quality: "draft" | "final"
    status: "queued" | "running" | "done" | "failed"
    progress: number
  }>
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "Duration pending"
  const rounded = Math.round(seconds)
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

type StudioSegmentEditPayload = {
  spoken_mn: string
  emotion?: string | null
  intensity?: number | null
  power?: number | null
  speed?: number | null
  pitch?: number | null
  speech_act?: string | null
  pause_style?: "none" | "breath" | "dramatic" | "hesitation" | null
}

function stageForProjectStatus(status?: string): ProcessingStage {
  switch (status) {
    case "uploading":
      return "upload"
    case "analyzing":
      return "translate"
    case "failed":
      return "error"
    default:
      return "done"
  }
}

function progressForProjectStatus(status?: string) {
  switch (status) {
    case "created":
      return 0
    case "uploading":
      return 25
    case "analyzing":
      return 75
    case "ready":
    case "rendering":
    case "rendered":
      return 100
    case "failed":
      return 100
    default:
      return 100
  }
}

function buildProjectBackedResult(bundle: StudioProjectBundle | null, voices: StudioVoiceSeed[]): ProcessingResult | null {
  if (!bundle) return null

  const voiceNameById = new Map(voices.map((voice) => [voice.id, voice.display_name]))
  const characterById = new Map(bundle.characters.map((character) => [character.id, character]))
  const countsBySpeakerId = new Map<string, number>()

  const segments = bundle.segments.map((segment) => {
    const character = segment.character_id ? characterById.get(segment.character_id) : undefined
    const speakerId = segment.speaker_id || character?.source_label || "spk_01"
    countsBySpeakerId.set(speakerId, (countsBySpeakerId.get(speakerId) || 0) + 1)

    const chosenVoiceId = character?.voice_id || segment.voice_id

    return {
      start: segment.start_sec,
      end: segment.end_sec,
      sourceText: segment.source_text,
      mongolianText: segment.spoken_mn || "",
      speakerId,
      emotion: segment.emotion,
      intensity: segment.intensity,
      power: segment.power,
      speed: segment.speed,
      pitch: segment.pitch,
      speechAct: segment.speech_act,
      pauseStyle: segment.pause_style,
      chosenVoiceId,
      chosenVoiceName:
        (chosenVoiceId ? voiceNameById.get(chosenVoiceId) : undefined) || segment.voice_name,
    }
  })

  const selectedVoices = Array.from(
    new Map(
      segments
        .filter((segment) => segment.chosenVoiceId && segment.chosenVoiceName)
        .map((segment) => [
          segment.chosenVoiceId as string,
          { id: segment.chosenVoiceId as string, displayName: segment.chosenVoiceName as string },
        ])
    ).values()
  )
  const remixArtifacts =
    bundle.project.mixed_audio_path ||
    bundle.project.final_video_path ||
    bundle.project.replacement_music_path ||
    bundle.project.export_ready
      ? {
          mode: bundle.project.remix_mode || "keep_background",
          dubbedSegmentAudioPaths: [],
          mixedAudioPath: bundle.project.mixed_audio_path,
          replacementMusicPath: bundle.project.replacement_music_path,
          finalVideoPath: bundle.project.final_video_path,
          exportReady: Boolean(
            bundle.project.export_ready ||
              bundle.project.mixed_audio_path ||
              bundle.project.final_video_path
          ),
          fallbackUsed: false,
          warnings: [],
          selectedVoices,
          segmentCount: segments.length,
        }
      : undefined

  return {
    success: true,
    jobId: bundle.project.id,
    stage: bundle.project.pipeline_stage || stageForProjectStatus(bundle.project.status),
    progress:
      typeof bundle.project.pipeline_progress === "number"
        ? bundle.project.pipeline_progress
        : progressForProjectStatus(bundle.project.status),
    logs: [],
    sourceName: bundle.project.title || bundle.project.source_name || bundle.project.id,
    sourceType: bundle.project.source_type || "",
    detectedLanguage: bundle.project.source_lang || "",
    fullTranscript: bundle.segments.map((segment) => segment.source_text).join(" ").trim(),
    fullTranslation: bundle.segments.map((segment) => segment.spoken_mn || "").join(" ").trim(),
    segments,
    remixArtifacts,
    speakerSummary: Array.from(countsBySpeakerId.entries()).map(([speakerId, segmentCount]) => ({
      speakerId,
      segmentCount,
    })),
  }
}

function buildStudioViewResult(
  bundle: StudioProjectBundle | null,
  runtimeResult: ProcessingResult | null,
  voices: StudioVoiceSeed[]
) {
  const projectResult = buildProjectBackedResult(bundle, voices)
  if (!projectResult) return runtimeResult

  if (!runtimeResult || runtimeResult.jobId !== bundle?.project.id) {
    return projectResult
  }

  return {
    ...projectResult,
    stage: runtimeResult.stage === "idle" ? projectResult.stage : runtimeResult.stage,
    progress: typeof runtimeResult.progress === "number" ? runtimeResult.progress : projectResult.progress,
    logs: Array.isArray(runtimeResult.logs) && runtimeResult.logs.length > 0 ? runtimeResult.logs : projectResult.logs,
    audioArtifacts: runtimeResult.audioArtifacts,
    remixArtifacts: runtimeResult.remixArtifacts || projectResult.remixArtifacts,
    voiceMatchSummary: runtimeResult.voiceMatchSummary,
    warnings: runtimeResult.warnings,
    errorCode: runtimeResult.errorCode,
    error: runtimeResult.error,
    message: runtimeResult.message,
  }
}

function applyStudioOverrides(
  result: ProcessingResult | null,
  bundle: StudioProjectBundle | null,
  voices: StudioVoiceSeed[]
) {
  if (!result || !bundle) return result

  const voiceNameById = new Map(voices.map((voice) => [voice.id, voice.display_name]))
  const segmentOverridesByIndex = new Map(bundle.segments.map((segment) => [segment.idx, segment]))
  const voiceAssignmentsBySpeakerId = new Map(
    bundle.characters.map((character) => [
      character.source_label,
      {
        voiceId: character.voice_id,
        voiceName: character.voice_id ? voiceNameById.get(character.voice_id) : undefined,
      },
    ])
  )

  const nextSegments = result.segments.map((segment, index) => {
    const assignment = voiceAssignmentsBySpeakerId.get(segment.speakerId || "spk_01")
    const storedSegment = segmentOverridesByIndex.get(index)

    return {
      ...segment,
      mongolianText: storedSegment?.spoken_mn ?? segment.mongolianText,
      emotion: storedSegment?.emotion ?? segment.emotion,
      intensity: storedSegment?.intensity ?? segment.intensity,
      power: storedSegment?.power ?? segment.power,
      speed: storedSegment?.speed ?? segment.speed,
      pitch: storedSegment?.pitch ?? segment.pitch,
      speechAct: storedSegment?.speech_act ?? segment.speechAct,
      pauseStyle: storedSegment?.pause_style ?? segment.pauseStyle,
      chosenVoiceId: assignment?.voiceId || segment.chosenVoiceId,
      chosenVoiceName: assignment?.voiceName || segment.chosenVoiceName,
    }
  })

  return {
    ...result,
    fullTranslation: nextSegments.map((segment) => segment.mongolianText).filter(Boolean).join(" ").trim() || result.fullTranslation,
    segments: nextSegments,
  }
}

export default function Home() {
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [activeLineIndex, setActiveLineIndex] = useState(0)
  const [projects, setProjects] = useState<StudioProjectSummary[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [activeProjectBundle, setActiveProjectBundle] = useState<StudioProjectBundle | null>(null)
  const [seededVoices, setSeededVoices] = useState<StudioVoiceSeed[]>([])
  const [systemStatus, setSystemStatus] = useState<{
    ffmpeg: { available: boolean; message: string }
    ytdlp: { available: boolean; message: string }
    elevenlabs: { configured: boolean; voiceMappingsConfigured: boolean; voiceMappingCount: number; message: string }
  } | null>(null)
  const [restoreJobId, setRestoreJobId] = useState("")
  const [restoreStatus, setRestoreStatus] = useState<{
    state: "idle" | "loading" | "error" | "done"
    source?: "url" | "manual" | "recent" | "project"
    message?: string
  }>({ state: "idle" })
  const [recentJobs, setRecentJobs] = useState<
    Array<{
      jobId: string
      updatedAt: string
      sourceName: string
      sourceType: ProcessingResult["sourceType"]
      stage: ProcessingResult["stage"]
      remixMode?: string
      mixedAudioReady: boolean
      finalVideoReady: boolean
    }>
  >([])
  const [characterDrafts, setCharacterDrafts] = useState<Record<string, { name: string; voiceId: string }>>({})
  const [characterSaveState, setCharacterSaveState] = useState<
    Record<string, { state: "idle" | "saving" | "saved" | "error"; message?: string }>
  >({})
  const [projectTitleDraft, setProjectTitleDraft] = useState("")
  const [projectTitleSaveState, setProjectTitleSaveState] = useState<{
    state: "idle" | "saving" | "saved" | "error"
    message?: string
  }>({ state: "idle" })

  const handleStart = (nextResult: ProcessingResult) => {
    setResult(nextResult)
    setSelectedProjectId(nextResult.jobId || "")
    setActiveLineIndex(0)
  }

  const handleSuccess = (nextResult: ProcessingResult) => {
    setResult(nextResult)
    setSelectedProjectId(nextResult.jobId || "")
    setActiveLineIndex(0)
  }

  const handleReset = () => {
    setResult(null)
    setActiveLineIndex(0)
    setSelectedProjectId("")
  }

  const openStoredProject = (projectId: string) => {
    setSelectedProjectId(projectId)
    setRestoreJobId(projectId)
    setActiveLineIndex(0)
    setResult((current) => (current?.jobId === projectId ? current : null))
    setRestoreStatus({
      state: "done",
      source: "project",
      message: "Opened saved project data.",
    })
  }

  const handleRestore = async (jobIdInput?: string, source: "url" | "manual" | "recent" | "project" = "manual") => {
    const jobId = (jobIdInput || restoreJobId).trim()
    if (!jobId) {
      setRestoreStatus({ state: "error", source, message: "Enter a jobId first." })
      return
    }

    setRestoreStatus({
      state: "loading",
      source,
      message:
        source === "url"
          ? "Restoring result from URL..."
          : source === "recent"
            ? "Restoring recent job..."
            : source === "project"
              ? "Opening stored project..."
              : "Restoring result from jobId...",
    })
    try {
      const response = await fetch(`/api/status/${encodeURIComponent(jobId)}`)
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        setRestoreStatus({
          state: "error",
          source,
          message: data.message || data.errorCode || "Restore failed.",
        })
        return
      }

      setResult(data)
      setSelectedProjectId(jobId)
      setActiveLineIndex(0)
      setRestoreStatus({
        state: "done",
        source,
        message:
          source === "url"
            ? "Stored result restored from URL."
            : source === "recent"
              ? "Recent job restored."
              : source === "project"
                ? "Stored project restored."
              : "Stored result restored from jobId.",
      })
    } catch (error) {
      setRestoreStatus({
        state: "error",
        source,
        message: error instanceof Error ? error.message : "Restore failed.",
      })
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadSystemStatus() {
      try {
        const response = await fetch("/api/system/status")
        const data = await response.json()
        if (!cancelled) {
          setSystemStatus(
            data?.ffmpeg && data?.ytdlp && data?.elevenlabs
              ? {
                  ffmpeg: data.ffmpeg,
                  ytdlp: data.ytdlp,
                  elevenlabs: data.elevenlabs,
                }
              : null
          )
        }
      } catch {
        if (!cancelled) {
          setSystemStatus(null)
        }
      }
    }

    async function loadRecentJobs() {
      try {
        const response = await fetch("/api/status/recent")
        const data = await response.json()
        if (!cancelled) {
          setRecentJobs(Array.isArray(data?.jobs) ? data.jobs : [])
        }
      } catch {
        if (!cancelled) {
          setRecentJobs([])
        }
      }
    }

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects")
        const data = await response.json()
        if (!cancelled) {
          setProjects(Array.isArray(data?.projects) ? data.projects : [])
        }
      } catch {
        if (!cancelled) {
          setProjects([])
        }
      }
    }

    async function loadSeededVoices() {
      try {
        const response = await fetch("/api/voices")
        const data = await response.json()
        if (!cancelled) {
          setSeededVoices(Array.isArray(data?.voices) ? data.voices : [])
        }
      } catch {
        if (!cancelled) {
          setSeededVoices([])
        }
      }
    }

    loadSystemStatus()
    loadRecentJobs()
    loadProjects()
    loadSeededVoices()
    return () => {
      cancelled = true
    }
  }, [result?.jobId])

  useEffect(() => {
    const jobIdFromUrl = new URLSearchParams(window.location.search).get("jobId")?.trim()
    if (!jobIdFromUrl) return
    if (result?.jobId === jobIdFromUrl) return

    setRestoreJobId(jobIdFromUrl)
    setSelectedProjectId(jobIdFromUrl)
    void handleRestore(jobIdFromUrl, "url")
  }, [result?.jobId])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const jobIdFromUrl = params.get("jobId")?.trim()
    if (jobIdFromUrl) return

    const projectIdFromUrl = params.get("projectId")?.trim()
    if (!projectIdFromUrl) return
    if (selectedProjectId === projectIdFromUrl) return
    if (result?.jobId === projectIdFromUrl) return

    setSelectedProjectId(projectIdFromUrl)
    setRestoreJobId(projectIdFromUrl)
    setActiveLineIndex(0)
    setResult((current) => (current?.jobId === projectIdFromUrl ? current : null))
    setRestoreStatus({
      state: "done",
      source: "project",
      message: "Opened saved project from URL.",
    })
  }, [result?.jobId, selectedProjectId])

  useEffect(() => {
    let cancelled = false

    async function loadActiveProjectBundle(projectId: string) {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`)
        const data = await response.json()
        if (!cancelled) {
          setActiveProjectBundle(response.ok && data?.project ? data : null)
        }
      } catch {
        if (!cancelled) {
          setActiveProjectBundle(null)
        }
      }
    }

    const projectId = selectedProjectId || result?.jobId
    if (!projectId) {
      setActiveProjectBundle(null)
      return () => {
        cancelled = true
      }
    }

    void loadActiveProjectBundle(projectId)
    return () => {
      cancelled = true
    }
  }, [result?.jobId, selectedProjectId])

  useEffect(() => {
    const nextDrafts = Object.fromEntries(
      (activeProjectBundle?.characters || []).map((character) => [
        character.id,
        {
          name: character.name,
          voiceId: character.voice_id || "",
        },
      ])
    )
    setCharacterDrafts(nextDrafts)
    setCharacterSaveState({})
  }, [activeProjectBundle?.project.id, activeProjectBundle?.project.updated_at])

  useEffect(() => {
    setProjectTitleDraft(activeProjectBundle?.project.title || "")
    setProjectTitleSaveState({ state: "idle" })
  }, [activeProjectBundle?.project.id, activeProjectBundle?.project.updated_at])

  const displayResult = applyStudioOverrides(
    buildStudioViewResult(activeProjectBundle, result, seededVoices),
    activeProjectBundle,
    seededVoices
  )
  const activeLine =
    displayResult && Array.isArray(displayResult.segments) && displayResult.segments.length > 0
      ? displayResult.segments[Math.min(activeLineIndex, displayResult.segments.length - 1)]
      : null

  const isProcessing = Boolean(displayResult?.stage && displayResult.stage !== "idle" && displayResult.stage !== "done" && displayResult.stage !== "error")
  const femaleVoiceCount = seededVoices.filter((voice) => voice.gender === "female").length
  const maleVoiceCount = seededVoices.filter((voice) => voice.gender === "male").length
  const voiceNameById = Object.fromEntries(seededVoices.map((voice) => [voice.id, voice.display_name]))
  const activeCharacterLabels = Object.fromEntries(
    (activeProjectBundle?.characters || []).map((character) => [character.source_label, character.name])
  )
  const activeVoiceAssignments = Object.fromEntries(
    (activeProjectBundle?.characters || []).map((character) => [
      character.source_label,
      {
        voiceId: character.voice_id,
        voiceName: character.voice_id ? voiceNameById[character.voice_id] : undefined,
      },
    ])
  )
  const setupWarnings = systemStatus
    ? [
        !systemStatus.ffmpeg.available ? "ffmpeg is required for upload processing, remix, and export." : null,
        !systemStatus.ytdlp.available ? "yt-dlp is missing, so Paste URL may be unavailable locally." : null,
        !systemStatus.elevenlabs.configured ? "ElevenLabs is not configured, so provider-backed voice generation previews will stay unavailable." : null,
        systemStatus.elevenlabs.configured && !systemStatus.elevenlabs.voiceMappingsConfigured
          ? "ElevenLabs is connected, but no voice mappings were found for the current cast voices."
          : null,
      ].filter(Boolean)
    : []
  const castProjectId = activeProjectBundle?.project.id || selectedProjectId || result?.jobId || ""

  async function saveCharacter(characterId: string) {
    if (!activeProjectBundle?.project.id) return
    const draft = characterDrafts[characterId]
    if (!draft || !draft.name.trim()) {
      setCharacterSaveState((current) => ({
        ...current,
        [characterId]: { state: "error", message: "Character name is required." },
      }))
      return
    }

    setCharacterSaveState((current) => ({
      ...current,
      [characterId]: { state: "saving", message: "Saving..." },
    }))

    try {
      const response = await fetch(
        `/api/projects/${encodeURIComponent(activeProjectBundle.project.id)}/characters/${encodeURIComponent(characterId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: draft.name.trim(),
            voice_id: draft.voiceId || null,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok || !data?.ok || !data?.bundle) {
        setCharacterSaveState((current) => ({
          ...current,
          [characterId]: { state: "error", message: data?.message || "Save failed." },
        }))
        return
      }

      setActiveProjectBundle(data.bundle)
      setProjects((current) =>
        current.map((project) =>
          project.id === data.bundle.project.id
            ? {
                ...project,
                updated_at: data.bundle.project.updated_at,
              }
            : project
        )
      )
      setResult((current) => applyStudioOverrides(current, data.bundle, seededVoices))
      setCharacterSaveState((current) => ({
        ...current,
        [characterId]: { state: "saved", message: "Saved." },
      }))
    } catch (error) {
      setCharacterSaveState((current) => ({
        ...current,
        [characterId]: { state: "error", message: error instanceof Error ? error.message : "Save failed." },
      }))
    }
  }

  async function saveProjectTitle() {
    if (!activeProjectBundle?.project.id) return
    if (!projectTitleDraft.trim()) {
      setProjectTitleSaveState({ state: "error", message: "Project title is required." })
      return
    }

    setProjectTitleSaveState({ state: "saving", message: "Saving..." })

    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(activeProjectBundle.project.id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: projectTitleDraft.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok || !data?.ok || !data?.bundle) {
        setProjectTitleSaveState({ state: "error", message: data?.message || "Save failed." })
        return
      }

      setActiveProjectBundle(data.bundle)
      setProjects((current) =>
        current.map((project) =>
          project.id === data.bundle.project.id
            ? {
                ...project,
                title: data.bundle.project.title,
                updated_at: data.bundle.project.updated_at,
              }
            : project
        )
      )
      setProjectTitleSaveState({ state: "saved", message: "Saved." })
    } catch (error) {
      setProjectTitleSaveState({
        state: "error",
        message: error instanceof Error ? error.message : "Save failed.",
      })
    }
  }

  async function saveSegment(segmentId: string, updates: StudioSegmentEditPayload) {
    if (!activeProjectBundle?.project.id) {
      throw new Error("Project is not ready for segment edits yet.")
    }

    const response = await fetch(
      `/api/projects/${encodeURIComponent(activeProjectBundle.project.id)}/segments/${encodeURIComponent(segmentId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    )
    const data = await response.json()

    if (!response.ok || !data?.ok || !data?.bundle) {
      throw new Error(data?.message || "Segment save failed.")
    }

    setActiveProjectBundle(data.bundle)
    setProjects((current) =>
      current.map((project) =>
        project.id === data.bundle.project.id
          ? {
              ...project,
              updated_at: data.bundle.project.updated_at,
            }
          : project
      )
    )
    setResult((current) => applyStudioOverrides(current, data.bundle, seededVoices))
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f0e4d0_52%,#ede7dc_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[32px] border border-stone-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Globe2 className="h-3.5 w-3.5" />
                Mongolian video translation / dubbing
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Video-first transcript review for natural Mongolian
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                A first MVP scaffold inspired by video-first review tools and contextual translation UX. Upload a clip, inspect the original transcript, and compare it against a spoken-feeling Mongolian version line by line.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Primary path</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Upload File</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Secondary path</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Paste URL</div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Future-ready</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Dubbing controls</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-stone-200 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={castProjectId ? `/source?projectId=${encodeURIComponent(castProjectId)}` : "/source"}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Source review
              </Link>
              <Link
                href={castProjectId ? `/render?projectId=${encodeURIComponent(castProjectId)}` : "/render"}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Render handoff
              </Link>
              <Link
                href={castProjectId ? `/script?projectId=${encodeURIComponent(castProjectId)}` : "/script"}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Script layer
              </Link>
              <Link
                href={castProjectId ? `/performance?projectId=${encodeURIComponent(castProjectId)}` : "/performance"}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Performance direction
              </Link>
              <Link
                href={castProjectId ? `/voice-library?projectId=${encodeURIComponent(castProjectId)}` : "/voice-library"}
                className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
              >
                Character voice library
              </Link>
            </div>
          </div>
        </header>

        <StudioWorkflowNav
          activeStep="source"
          projectId={castProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6" id="source">
            <VideoUpload onStart={handleStart} onSuccess={handleSuccess} />
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Projects</div>
                  <div className="mt-1 text-sm text-stone-500">Persisted Phase 1 project records synced from the current local processing flow.</div>
                </div>
                <div className="text-sm text-stone-500">{projects.length > 0 ? `${projects.length} stored` : "No projects yet"}</div>
              </div>
              {projects.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {projects.slice(0, 6).map((project) => (
                    <div
                      key={project.id}
                      className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-stone-900">{project.title}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {project.id} · {project.status} · {project.source_type || "unknown"}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {formatDuration(project.duration_sec)} · {project.media_count} media · {project.character_count} characters · {project.segment_count} segments · {project.render_job_count} renders
                        </div>
                        <div className="mt-1 text-xs text-stone-500">Updated {formatUpdatedAt(project.updated_at)}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          openStoredProject(project.id)
                        }}
                        className="rounded-full border-stone-300 bg-white px-5"
                      >
                        Open project
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-stone-500">
                  Process a file or URL and the existing local pipeline will persist a project, its media, character records, segments, and render jobs here.
                </div>
              )}
            </div>
            {activeProjectBundle ? (
              <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Active project structure</div>
                    <div className="mt-1 text-sm text-stone-500">Real Phase 1 project, character, segment, media, and render records for the current workspace.</div>
                  </div>
                  <div className="text-sm text-stone-500">{activeProjectBundle.project.status}</div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={projectTitleDraft}
                    onChange={(event) => setProjectTitleDraft(event.target.value)}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveProjectTitle()}
                    className="rounded-full border-stone-300 bg-white px-5"
                  >
                    {projectTitleSaveState.state === "saving" ? "Saving..." : "Save title"}
                  </Button>
                </div>
                {projectTitleSaveState.message ? (
                  <div
                    className={`mt-2 text-xs ${
                      projectTitleSaveState.state === "error" ? "text-red-600" : "text-stone-500"
                    }`}
                  >
                    {projectTitleSaveState.message}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Media</div>
                    <div className="mt-1 text-sm font-medium text-stone-900">{activeProjectBundle.media_files.length}</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Characters</div>
                    <div className="mt-1 text-sm font-medium text-stone-900">{activeProjectBundle.characters.length}</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Segments</div>
                    <div className="mt-1 text-sm font-medium text-stone-900">{activeProjectBundle.segments.length}</div>
                  </div>
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Render jobs</div>
                    <div className="mt-1 text-sm font-medium text-stone-900">{activeProjectBundle.render_jobs.length}</div>
                  </div>
                </div>
                {activeProjectBundle.characters.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {activeProjectBundle.characters.map((character) => (
                      <div key={character.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                          <input
                            type="text"
                            value={characterDrafts[character.id]?.name || ""}
                            onChange={(event) =>
                              setCharacterDrafts((current) => ({
                                ...current,
                                [character.id]: {
                                  name: event.target.value,
                                  voiceId: current[character.id]?.voiceId || "",
                                },
                              }))
                            }
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900"
                          />
                          <select
                            value={characterDrafts[character.id]?.voiceId || ""}
                            onChange={(event) =>
                              setCharacterDrafts((current) => ({
                                ...current,
                                [character.id]: {
                                  name: current[character.id]?.name || character.name,
                                  voiceId: event.target.value,
                                },
                              }))
                            }
                            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900"
                          >
                            <option value="">No voice assigned</option>
                            {seededVoices.map((voice) => (
                              <option key={voice.id} value={voice.id}>
                                {voice.display_name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void saveCharacter(character.id)}
                            className="rounded-full border-stone-300 bg-white px-5"
                          >
                            {characterSaveState[character.id]?.state === "saving" ? "Saving..." : "Save"}
                          </Button>
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {character.source_label} · {character.segment_count} segments · {formatDuration(character.total_seconds)}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {character.voice_id ? `Voice seed: ${voiceNameById[character.voice_id] || character.voice_id}` : "Voice assignment pending"}
                        </div>
                        {characterSaveState[character.id]?.message ? (
                          <div
                            className={`mt-2 text-xs ${
                              characterSaveState[character.id]?.state === "error" ? "text-red-600" : "text-stone-500"
                            }`}
                          >
                            {characterSaveState[character.id]?.message}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-stone-500">Character records will appear here once the current project has timed segments.</div>
                )}
              </div>
            ) : null}
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Curated cast bank</div>
                  <div className="mt-1 text-sm text-stone-500">Seeded base voices from the current repo config, ready for character assignment.</div>
                </div>
                <div className="text-sm text-stone-500">{seededVoices.length > 0 ? `${seededVoices.length} seeded` : "Unavailable"}</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Female voices</div>
                  <div className="mt-1 text-sm font-medium text-stone-900">{femaleVoiceCount}</div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Male voices</div>
                  <div className="mt-1 text-sm font-medium text-stone-900">{maleVoiceCount}</div>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Character-first use</div>
                  <div className="mt-1 text-sm font-medium text-stone-900">Stable cast mapping</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-stone-600">
                {seededVoices.length > 0
                  ? "These seeded records back the current Phase 1 data layer while the existing voice library page stays available for deeper inspection."
                  : "Voice seed data is not available right now."}
              </div>
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Local setup readiness</div>
                <div className="text-sm text-stone-500">Read-only checks from the current backend</div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "ffmpeg",
                    ready: Boolean(systemStatus?.ffmpeg.available),
                    detail: systemStatus?.ffmpeg.available ? "Available for media processing" : "Missing",
                  },
                  {
                    label: "yt-dlp",
                    ready: Boolean(systemStatus?.ytdlp.available),
                    detail: systemStatus?.ytdlp.available ? "Available for URL import" : "Missing",
                  },
                  {
                    label: "ElevenLabs",
                    ready: Boolean(systemStatus?.elevenlabs.configured),
                    detail: systemStatus?.elevenlabs.configured
                      ? systemStatus?.elevenlabs.voiceMappingsConfigured
                        ? `${systemStatus.elevenlabs.voiceMappingCount} voice mapping${systemStatus.elevenlabs.voiceMappingCount === 1 ? "" : "s"} ready`
                        : "API key present, no voice mappings yet"
                      : "Not configured",
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-stone-900">{item.label}</div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          item.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {item.ready ? "ready" : "missing"}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-stone-600">{item.detail}</div>
                  </div>
                ))}
              </div>
              {systemStatus ? (
                setupWarnings.length > 0 ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {setupWarnings.join(" ")}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Local setup looks ready for upload, media processing, and optional provider-backed voice work.
                  </div>
                )
              ) : (
                <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                  Runtime readiness checks are unavailable right now.
                </div>
              )}
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Restore job</div>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={restoreJobId}
                  onChange={(event) => setRestoreJobId(event.target.value)}
                  placeholder="Paste a jobId"
                  className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                />
                <Button type="button" variant="outline" onClick={() => void handleRestore()} className="rounded-full border-stone-300 bg-white px-5">
                  Restore result
                </Button>
              </div>
              {restoreStatus.message ? (
                <div
                  className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                    restoreStatus.state === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : restoreStatus.state === "loading"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-stone-200 bg-stone-50 text-stone-700"
                  }`}
                >
                  {restoreStatus.message}
                </div>
              ) : (
                <div className="mt-3 text-sm text-stone-500">Reuse an existing jobId to reload the latest stored result.</div>
              )}
            </div>
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Recent jobs</div>
                <div className="text-sm text-stone-500">{recentJobs.length > 0 ? `${recentJobs.length} stored` : "No stored jobs yet"}</div>
              </div>
              {recentJobs.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {recentJobs.map((job) => (
                    <div key={job.jobId} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-stone-900">{job.sourceName}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {job.jobId} · {job.sourceType || "unknown"} · {job.stage}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {job.remixMode || "keep_background"} · mixed {job.mixedAudioReady ? "ready" : "not ready"} · video {job.finalVideoReady ? "ready" : "not ready"}
                        </div>
                        <div className="mt-1 text-xs text-stone-500 break-all">{typeof window !== "undefined" ? `${window.location.origin}/?jobId=${encodeURIComponent(job.jobId)}` : `/?jobId=${job.jobId}`}</div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setRestoreJobId(job.jobId)
                          void handleRestore(job.jobId, "recent")
                        }}
                        className="rounded-full border-stone-300 bg-white px-5"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-sm text-stone-500">Persisted jobs will appear here after processing.</div>
              )}
            </div>
            <ProcessingStatus result={displayResult} />
            <WorkspacePreview
              mediaName={displayResult?.sourceName || activeProjectBundle?.project.source_name}
              sourceType={displayResult?.sourceType || activeProjectBundle?.project.source_type}
              currentLine={activeLine}
              detectedLanguage={displayResult?.detectedLanguage}
              isProcessing={isProcessing}
              hasResult={Boolean(displayResult?.segments?.length || activeProjectBundle?.segments.length)}
            />
          </div>

          <div className="space-y-6" id="render">
            <TranscriptView
              result={displayResult}
              activeIndex={activeLineIndex}
              onSelectLine={setActiveLineIndex}
              onResultUpdate={setResult}
              characterLabels={activeCharacterLabels}
              voiceAssignments={activeVoiceAssignments}
              projectId={activeProjectBundle?.project.id}
              persistedSegments={activeProjectBundle?.segments}
              onSaveSegment={saveSegment}
            />

            {displayResult && (
              <div className="flex justify-center xl:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2 rounded-full border-stone-300 bg-white px-5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset workspace
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
