"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Captions, Headphones, Mic2 } from "lucide-react"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"
import { WorkspacePreview } from "@/components/workspace-preview"

type SeededVoiceRecord = {
  id: string
  display_name: string
}

type StudioProjectSummary = {
  id: string
  title: string
  status: string
}

type StudioProjectBundle = {
  project: {
    id: string
    title: string
    status: string
    source_lang?: string
    source_type?: "file" | "url" | ""
  }
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
    speech_act?: string
    emotion?: string
    intensity?: number
  }>
}

function formatTime(value?: number) {
  if (value === undefined || value === null) return ""
  const totalMs = Math.round(value * 1000)
  const mins = Math.floor(totalMs / 60000)
  const secs = Math.floor((totalMs % 60000) / 1000)
  const ms = Math.floor((totalMs % 1000) / 10)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms
    .toString()
    .padStart(2, "0")}`
}

function formatDurationSeconds(value?: number) {
  if (value === undefined || value === null || value <= 0) return "0:00"
  const rounded = Math.round(value)
  const mins = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function SourceSegmentCard({
  index,
  isActive,
  characterLabel,
  sourceLabel,
  voiceName,
  start,
  end,
  sourceText,
  onSelect,
}: {
  index: number
  isActive: boolean
  characterLabel?: string
  sourceLabel?: string
  voiceName?: string
  start: number
  end: number
  sourceText: string
  onSelect?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[24px] border p-4 text-left transition ${
        isActive
          ? "border-amber-300 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] shadow-sm"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
          Line {index + 1}
        </div>
        <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-600">
          {formatTime(start)} - {formatTime(end)}
        </div>
        {characterLabel ? (
          <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
            {characterLabel}
          </div>
        ) : null}
        {voiceName ? (
          <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800">
            {voiceName}
          </div>
        ) : null}
      </div>

      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Source transcript</div>
      <div className="mt-2 text-sm leading-7 text-stone-900">{sourceText}</div>

      {sourceLabel ? (
        <div className="mt-3 text-xs text-stone-500">Detected source label: {sourceLabel}</div>
      ) : null}
    </button>
  )
}

function readProjectIdFromQuery() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("projectId")?.trim() || ""
}

export default function SourcePage() {
  const [projects, setProjects] = useState<StudioProjectSummary[]>([])
  const [seededVoices, setSeededVoices] = useState<SeededVoiceRecord[]>([])
  const [queryProjectId] = useState(readProjectIdFromQuery)
  const [manualProjectId, setManualProjectId] = useState("")
  const [loadedBundle, setLoadedBundle] = useState<{
    projectId: string
    bundle: StudioProjectBundle | null
  } | null>(null)
  const [segmentSelection, setSegmentSelection] = useState({ scopeKey: "", index: 0 })

  const effectiveProjectId = manualProjectId || queryProjectId || projects[0]?.id || ""
  const activeProjectBundle =
    effectiveProjectId && loadedBundle?.projectId === effectiveProjectId ? loadedBundle.bundle : null
  const segmentScopeKey = `${effectiveProjectId}:${activeProjectBundle?.project.id ?? ""}:${activeProjectBundle?.segments.length ?? 0}`
  const activeSegmentIndex =
    segmentSelection.scopeKey === segmentScopeKey ? segmentSelection.index : 0
  const selectSegmentIndex = (index: number) => {
    setSegmentSelection({ scopeKey: segmentScopeKey, index })
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      try {
        const [projectsResponse, voicesResponse] = await Promise.all([fetch("/api/projects"), fetch("/api/voices")])
        const [projectsData, voicesData] = await Promise.all([projectsResponse.json(), voicesResponse.json()])
        if (!cancelled) {
          setProjects(Array.isArray(projectsData?.projects) ? projectsData.projects : [])
          setSeededVoices(Array.isArray(voicesData?.voices) ? voicesData.voices : [])
        }
      } catch {
        if (!cancelled) {
          setProjects([])
          setSeededVoices([])
        }
      }
    }

    void loadInitialData()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!effectiveProjectId) return

    let cancelled = false

    async function loadActiveProjectBundle(projectId: string) {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}`)
        const data = await response.json()
        if (!cancelled) {
          setLoadedBundle({
            projectId,
            bundle: response.ok && data?.project ? data : null,
          })
        }
      } catch {
        if (!cancelled) {
          setLoadedBundle({ projectId, bundle: null })
        }
      }
    }

    void loadActiveProjectBundle(effectiveProjectId)
    return () => {
      cancelled = true
    }
  }, [effectiveProjectId])

  const voiceNameById = useMemo(
    () => Object.fromEntries(seededVoices.map((voice) => [voice.id, voice.display_name])),
    [seededVoices]
  )

  const characterById = useMemo(
    () => new Map((activeProjectBundle?.characters || []).map((character) => [character.id, character])),
    [activeProjectBundle?.characters]
  )

  const selectedSegment =
    activeProjectBundle?.segments[
      Math.min(activeSegmentIndex, Math.max((activeProjectBundle?.segments.length || 1) - 1, 0))
    ]
  const selectedCharacter = selectedSegment?.character_id
    ? characterById.get(selectedSegment.character_id)
    : undefined
  const selectedVoiceName =
    (selectedCharacter?.voice_id ? voiceNameById[selectedCharacter.voice_id] : undefined) ||
    selectedSegment?.voice_name

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f1e8d7_48%,#f7f4ed_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Mic2 className="h-3.5 w-3.5" />
                Source review
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Project-backed transcript and character review
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                Open a saved project and review the real source transcript, character labels, and saved segment timing before moving into script, cast, and performance work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px] lg:grid-cols-1">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Current project</div>
                <div className="mt-1 text-sm font-medium text-stone-900">
                  {activeProjectBundle?.project.title || "Choose a saved project"}
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Saved segments</div>
                <div className="mt-1 text-sm font-medium text-stone-900">
                  {activeProjectBundle?.segments.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Focus</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Source transcript and character continuity</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Link
              href={effectiveProjectId ? `/script?projectId=${encodeURIComponent(effectiveProjectId)}` : "/script"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open script
            </Link>
            <Link
              href={effectiveProjectId ? `/performance?projectId=${encodeURIComponent(effectiveProjectId)}` : "/performance"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open performance
            </Link>
            <Link
              href="/"
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Back to main workspace
            </Link>
          </div>
        </header>

        <StudioWorkflowNav
          activeStep="source"
          projectId={effectiveProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                <Captions className="h-4 w-4" />
                Source context
              </div>

              <select
                value={effectiveProjectId}
                onChange={(event) => setManualProjectId(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
              >
                {projects.length === 0 ? <option value="">No saved projects</option> : null}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>

              {activeProjectBundle ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Source type</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {activeProjectBundle.project.source_type || "unknown"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Detected language</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {activeProjectBundle.project.source_lang || "pending"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Characters</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {activeProjectBundle.characters.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Project status</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {activeProjectBundle.project.status}
                      </div>
                    </div>
                  </div>

                  {activeProjectBundle.characters.length > 0 ? (
                    <div className="rounded-[28px] border border-stone-200 bg-white p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                        <Headphones className="h-4 w-4" />
                        Saved character roster
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {activeProjectBundle.characters.map((character) => (
                          <div key={character.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold text-stone-950">{character.name}</div>
                                <div className="mt-1 text-xs text-stone-500">{character.source_label}</div>
                              </div>
                              <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
                                {character.segment_count} segments
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
                                {formatDurationSeconds(character.total_seconds)} total
                              </span>
                              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
                                {character.voice_id ? voiceNameById[character.voice_id] || character.voice_id : "Voice pending"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Selected transcript line
                    </div>
                    <div className="mt-2 text-base font-semibold text-stone-950">
                      {selectedCharacter?.name || `Character ${activeSegmentIndex + 1}`}
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                      {selectedSegment
                        ? `${formatTime(selectedSegment.start_sec)} - ${formatTime(selectedSegment.end_sec)}`
                        : "No line selected"}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                          Character
                        </div>
                        <div className="mt-1 text-sm text-stone-900">
                          {selectedCharacter?.name || "Unassigned character"}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {selectedCharacter?.source_label || selectedSegment?.speaker_id || "spk_01"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                          Assigned voice
                        </div>
                        <div className="mt-1 text-sm text-stone-900">{selectedVoiceName || "Voice assignment pending"}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {selectedCharacter?.segment_count || 0} saved segments in this character track
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-stone-200 bg-white p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                      Source transcript
                    </div>
                    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-900">
                      {selectedSegment?.source_text || "No saved source transcript line selected yet."}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedSegment?.speech_act ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Speech act: {selectedSegment.speech_act}
                        </span>
                      ) : null}
                      {selectedSegment?.emotion ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Emotion: {selectedSegment.emotion}
                        </span>
                      ) : null}
                      {selectedSegment?.intensity !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Intensity: {selectedSegment.intensity}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <WorkspacePreview
                    mediaName={activeProjectBundle.project.title}
                    sourceType={activeProjectBundle.project.source_type}
                    currentLine={
                      selectedSegment
                        ? {
                            start: selectedSegment.start_sec,
                            end: selectedSegment.end_sec,
                            sourceText: selectedSegment.source_text,
                            mongolianText: selectedSegment.spoken_mn || "Spoken Mongolian will appear later in the workflow.",
                            chosenVoiceName: selectedVoiceName,
                          }
                        : null
                    }
                    detectedLanguage={activeProjectBundle.project.source_lang}
                    isProcessing={false}
                    hasResult={Boolean(activeProjectBundle.segments.length)}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                  Choose a saved project to open its persisted source review.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Source transcript</div>
                  <div className="mt-1 text-sm text-stone-500">
                    Real saved segment list from the selected project, with character and speaker context.
                  </div>
                </div>
                <div className="text-sm text-stone-500">
                  {activeProjectBundle?.segments.length ? `${activeProjectBundle.segments.length} saved segments` : "No saved segments"}
                </div>
              </div>

              {activeProjectBundle?.segments.length ? (
                <div className="space-y-3">
                  {activeProjectBundle.segments.map((segment, index) => {
                    const character = segment.character_id ? characterById.get(segment.character_id) : undefined
                    const voiceName =
                      (character?.voice_id ? voiceNameById[character.voice_id] : undefined) || segment.voice_name

                    return (
                      <SourceSegmentCard
                        key={segment.id}
                        index={index}
                        isActive={index === activeSegmentIndex}
                        characterLabel={character?.name}
                        sourceLabel={character?.source_label || segment.speaker_id}
                        voiceName={voiceName}
                        start={segment.start_sec}
                        end={segment.end_sec}
                        sourceText={segment.source_text}
                        onSelect={() => selectSegmentIndex(index)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  Saved source transcript segments will appear here after a project has transcript records in the Phase 1 store.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
