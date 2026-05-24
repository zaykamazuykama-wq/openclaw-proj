"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Globe2, SlidersHorizontal } from "lucide-react"
import { SegmentCard } from "@/components/transcript-view"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"
import type { TranscriptSegment } from "@/lib/types"

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
    emotion?: string
    intensity?: number
    power?: number
    speed?: number
    pitch?: number
    speech_act?: string
    pause_style?: "none" | "breath" | "dramatic" | "hesitation"
  }>
}

type SegmentEditPayload = {
  spoken_mn: string
  emotion?: string | null
  intensity?: number | null
  power?: number | null
  speed?: number | null
  pitch?: number | null
  speech_act?: string | null
  pause_style?: "none" | "breath" | "dramatic" | "hesitation" | null
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

function readProjectIdFromQuery() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("projectId")?.trim() || ""
}

export default function PerformancePage() {
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

  const displaySegments = useMemo<TranscriptSegment[]>(() => {
    if (!activeProjectBundle) return []

    return activeProjectBundle.segments.map((segment) => {
      const character = segment.character_id ? characterById.get(segment.character_id) : undefined
      const chosenVoiceId = character?.voice_id || segment.voice_id

      return {
        start: segment.start_sec,
        end: segment.end_sec,
        sourceText: segment.source_text,
        mongolianText: segment.spoken_mn || "",
        speakerId: segment.speaker_id || character?.source_label || "spk_01",
        emotion: segment.emotion,
        intensity: segment.intensity,
        power: segment.power,
        speed: segment.speed,
        pitch: segment.pitch,
        speechAct: segment.speech_act,
        pauseStyle: segment.pause_style,
        chosenVoiceId,
        chosenVoiceName:
          (chosenVoiceId ? voiceNameById[chosenVoiceId] : undefined) || segment.voice_name,
      }
    })
  }, [activeProjectBundle, characterById, voiceNameById])

  const persistedSegments = useMemo(
    () => (activeProjectBundle?.segments || []).map((segment) => ({ id: segment.id, idx: segment.idx })),
    [activeProjectBundle?.segments]
  )

  const characterLabels = useMemo(
    () =>
      Object.fromEntries(
        (activeProjectBundle?.characters || []).map((character) => [character.source_label, character.name])
      ),
    [activeProjectBundle?.characters]
  )

  const selectedStoredSegment =
    activeProjectBundle?.segments[Math.min(activeSegmentIndex, Math.max((activeProjectBundle?.segments.length || 1) - 1, 0))]
  const selectedDisplaySegment =
    displaySegments[Math.min(activeSegmentIndex, Math.max(displaySegments.length - 1, 0))]
  const selectedCharacter = selectedStoredSegment?.character_id
    ? characterById.get(selectedStoredSegment.character_id)
    : undefined
  const selectedVoiceName =
    (selectedCharacter?.voice_id ? voiceNameById[selectedCharacter.voice_id] : undefined) ||
    selectedStoredSegment?.voice_name ||
    selectedDisplaySegment?.chosenVoiceName

  async function saveSegment(segmentId: string, updates: SegmentEditPayload) {
    if (!effectiveProjectId) return

    const response = await fetch(
      `/api/projects/${encodeURIComponent(effectiveProjectId)}/segments/${encodeURIComponent(segmentId)}`,
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

    setLoadedBundle({ projectId: effectiveProjectId, bundle: data.bundle })
    setProjects((current) =>
      current.map((project) =>
        project.id === data.bundle.project.id
          ? {
              ...project,
              title: data.bundle.project.title,
              status: data.bundle.project.status,
            }
          : project
      )
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f1e8d7_48%,#f7f4ed_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Globe2 className="h-3.5 w-3.5" />
                Performance direction
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Project-backed segment direction for Mongolian dubbing
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                Edit the saved spoken Mongolian script and delivery values for each line. This screen reads real project-backed segments and writes back through the existing Phase 1 store.
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
                <div className="mt-1 text-sm font-medium text-stone-900">Speech act, emotion, and direction</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Link
              href={effectiveProjectId ? `/voice-library?projectId=${encodeURIComponent(effectiveProjectId)}` : "/voice-library"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open cast
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
          activeStep="performance"
          projectId={effectiveProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                <SlidersHorizontal className="h-4 w-4" />
                Performance context
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
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Selected line</div>
                    <div className="mt-2 text-base font-semibold text-stone-950">
                      {selectedCharacter?.name || `Character ${activeSegmentIndex + 1}`}
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                      {selectedStoredSegment ? `${formatTime(selectedStoredSegment.start_sec)} - ${formatTime(selectedStoredSegment.end_sec)}` : "No line selected"}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Character</div>
                        <div className="mt-1 text-sm text-stone-900">
                          {selectedCharacter?.name || characterLabels[selectedDisplaySegment?.speakerId || "spk_01"] || "Unassigned character"}
                        </div>
                        <div className="mt-1 text-xs text-stone-500">
                          {selectedCharacter?.source_label || selectedDisplaySegment?.speakerId || "spk_01"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Assigned voice</div>
                        <div className="mt-1 text-sm text-stone-900">{selectedVoiceName || "Voice assignment pending"}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {selectedCharacter?.segment_count || 0} saved segments in this character track
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Saved direction</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedDisplaySegment?.speechAct ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Speech act: {selectedDisplaySegment.speechAct}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.emotion ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Emotion: {selectedDisplaySegment.emotion}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.intensity !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Intensity: {selectedDisplaySegment.intensity}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.power !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Power: {selectedDisplaySegment.power}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.speed !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Speed: {selectedDisplaySegment.speed}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.pitch !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Pitch: {selectedDisplaySegment.pitch}
                        </span>
                      ) : null}
                      {selectedDisplaySegment?.pauseStyle ? (
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          Pause: {selectedDisplaySegment.pauseStyle}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Direction note</div>
                    <div className="mt-2 leading-7 text-stone-700">
                      AI proposes the line delivery, then you adjust the saved spoken Mongolian and performance direction one segment at a time.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                  Choose a saved project to open its persisted performance direction.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Performance</div>
                  <div className="mt-1 text-sm text-stone-500">
                    Real saved segment list from the selected project, with persisted direction values.
                  </div>
                </div>
                <div className="text-sm text-stone-500">
                  {displaySegments.length > 0 ? `${displaySegments.length} saved segments` : "No saved segments"}
                </div>
              </div>

              {displaySegments.length > 0 ? (
                <div className="space-y-3">
                  {displaySegments.map((segment, index) => (
                    <SegmentCard
                      key={persistedSegments[index]?.id || `${segment.start}-${segment.end}-${index}`}
                      segment={segment}
                      isActive={index === activeSegmentIndex}
                      characterLabel={characterLabels[segment.speakerId || "spk_01"]}
                      persistedSegmentId={persistedSegments[index]?.id}
                      onSaveSegment={saveSegment}
                      onSelect={() => selectSegmentIndex(index)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  Saved performance segments will appear here after a project has transcript and script records in the Phase 1 store.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
