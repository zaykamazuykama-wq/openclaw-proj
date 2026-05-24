"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { FileText, Languages } from "lucide-react"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"

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
    literal_mn?: string
    spoken_mn?: string
    voice_id?: string
    voice_name?: string
    speech_act?: string
    emotion?: string
    intensity?: number
  }>
}

type SegmentEditPayload = {
  spoken_mn: string
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

function SegmentListCard({
  isActive,
  index,
  sourceText,
  literalText,
  spokenText,
  characterLabel,
  onSelect,
  viewMode,
}: {
  isActive: boolean
  index: number
  sourceText: string
  literalText?: string
  spokenText?: string
  characterLabel?: string
  onSelect?: () => void
  viewMode: "literal" | "spoken"
}) {
  const previewText =
    viewMode === "literal"
      ? literalText?.trim() || "No saved literal Mongolian draft yet."
      : spokenText?.trim() || "No saved spoken Mongolian yet."

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
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
          Line {index + 1}
        </span>
        {characterLabel ? (
          <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-600">
            {characterLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Source</div>
      <div className="mt-1 text-sm leading-6 text-stone-900">{sourceText}</div>
      <div className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {viewMode === "literal" ? "Literal Mongolian" : "Spoken Mongolian"}
      </div>
      <div className="mt-1 text-sm leading-6 text-stone-700">{previewText}</div>
    </button>
  )
}

type ScriptSaveState = {
  state: "idle" | "saving" | "saved" | "error"
  message?: string
}

function readProjectIdFromQuery() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("projectId")?.trim() || ""
}

export default function ScriptPage() {
  const [projects, setProjects] = useState<StudioProjectSummary[]>([])
  const [seededVoices, setSeededVoices] = useState<SeededVoiceRecord[]>([])
  const [queryProjectId] = useState(readProjectIdFromQuery)
  const [manualProjectId, setManualProjectId] = useState("")
  const [loadedBundle, setLoadedBundle] = useState<{
    projectId: string
    bundle: StudioProjectBundle | null
  } | null>(null)
  const [segmentSelection, setSegmentSelection] = useState({ scopeKey: "", index: 0 })
  const [viewMode, setViewMode] = useState<"literal" | "spoken">("spoken")
  const [spokenEdit, setSpokenEdit] = useState<{
    segmentId: string
    spoken: string
    saveState: ScriptSaveState
  }>({ segmentId: "", spoken: "", saveState: { state: "idle" } })

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
    activeProjectBundle?.segments[Math.min(activeSegmentIndex, Math.max((activeProjectBundle?.segments.length || 1) - 1, 0))]
  const selectedCharacter = selectedSegment?.character_id ? characterById.get(selectedSegment.character_id) : undefined
  const selectedVoiceName =
    (selectedCharacter?.voice_id ? voiceNameById[selectedCharacter.voice_id] : undefined) ||
    selectedSegment?.voice_name
  const selectedSegmentId = selectedSegment?.id ?? ""
  const isEditingCurrentSegment = spokenEdit.segmentId === selectedSegmentId
  const spokenDraft = isEditingCurrentSegment ? spokenEdit.spoken : selectedSegment?.spoken_mn || ""
  const saveState = isEditingCurrentSegment ? spokenEdit.saveState : { state: "idle" as const }

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

  async function handleSave() {
    if (!selectedSegment) return
    if (!spokenDraft.trim()) {
      setSpokenEdit({
        segmentId: selectedSegmentId,
        spoken: spokenDraft,
        saveState: { state: "error", message: "Spoken Mongolian cannot be empty." },
      })
      return
    }

    const trimmedSpoken = spokenDraft.trim()
    setSpokenEdit({
      segmentId: selectedSegmentId,
      spoken: trimmedSpoken,
      saveState: { state: "saving", message: "Saving spoken Mongolian..." },
    })
    try {
      await saveSegment(selectedSegment.id, { spoken_mn: trimmedSpoken })
      setSpokenEdit({
        segmentId: selectedSegmentId,
        spoken: trimmedSpoken,
        saveState: { state: "saved", message: "Saved." },
      })
    } catch (error) {
      setSpokenEdit({
        segmentId: selectedSegmentId,
        spoken: trimmedSpoken,
        saveState: {
          state: "error",
          message: error instanceof Error ? error.message : "Segment save failed.",
        },
      })
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f1e8d7_48%,#f7f4ed_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <FileText className="h-3.5 w-3.5" />
                Script layer
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Project-backed Mongolian script review
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                Review the saved source line, literal draft, and spoken Mongolian together. This screen keeps the Literal ⇄ Spoken product idea visible while making the saved script state first-class project data.
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
                <div className="mt-1 text-sm font-medium text-stone-900">Literal draft versus spoken Mongolian</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Link
              href={effectiveProjectId ? `/performance?projectId=${encodeURIComponent(effectiveProjectId)}` : "/performance"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open performance
            </Link>
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
          activeStep="script"
          projectId={effectiveProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                <Languages className="h-4 w-4" />
                Script context
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
                      {selectedSegment ? `${formatTime(selectedSegment.start_sec)} - ${formatTime(selectedSegment.end_sec)}` : "No line selected"}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-white p-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Character</div>
                        <div className="mt-1 text-sm text-stone-900">{selectedCharacter?.name || "Unassigned character"}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {selectedCharacter?.source_label || selectedSegment?.speaker_id || "spk_01"}
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

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Literal ⇄ Spoken</div>
                        <div className="mt-1 text-sm text-stone-500">
                          Switch emphasis while keeping source, literal, and spoken layers together.
                        </div>
                      </div>
                      <div className="inline-flex rounded-full border border-stone-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setViewMode("literal")}
                          className={`rounded-full px-4 py-2 text-sm font-medium ${
                            viewMode === "literal" ? "bg-stone-900 text-white" : "text-stone-600"
                          }`}
                        >
                          Literal
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("spoken")}
                          className={`rounded-full px-4 py-2 text-sm font-medium ${
                            viewMode === "spoken" ? "bg-stone-900 text-white" : "text-stone-600"
                          }`}
                        >
                          Spoken
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-stone-200 bg-white p-5">
                    <div className="grid gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Source text</div>
                        <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm leading-7 text-stone-900">
                          {selectedSegment?.source_text || "No saved source line selected yet."}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Literal Mongolian</div>
                        <div
                          className={`mt-2 rounded-2xl border p-4 text-sm leading-7 ${
                            viewMode === "literal"
                              ? "border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] text-stone-950"
                              : "border-stone-200 bg-stone-50 text-stone-700"
                          }`}
                        >
                          {selectedSegment?.literal_mn?.trim() || "No saved literal Mongolian draft for this project yet."}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Spoken Mongolian</div>
                        <textarea
                          value={spokenDraft}
                          onChange={(event) =>
                            setSpokenEdit({
                              segmentId: selectedSegmentId,
                              spoken: event.target.value,
                              saveState: { state: "idle" },
                            })
                          }
                          className={`mt-2 min-h-36 w-full rounded-2xl border p-4 text-sm leading-7 ${
                            viewMode === "spoken"
                              ? "border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] text-stone-950"
                              : "border-stone-200 bg-stone-50 text-stone-900"
                          }`}
                          placeholder="Saved spoken Mongolian will appear here."
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {selectedSegment?.speech_act ? (
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-700">
                          Speech act: {selectedSegment.speech_act}
                        </span>
                      ) : null}
                      {selectedSegment?.emotion ? (
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-700">
                          Emotion: {selectedSegment.emotion}
                        </span>
                      ) : null}
                      {selectedSegment?.intensity !== undefined ? (
                        <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-medium text-stone-700">
                          Intensity: {selectedSegment.intensity}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className={`text-xs ${saveState.state === "error" ? "text-red-600" : "text-stone-500"}`}>
                        {saveState.message || "Save spoken Mongolian back into the project-backed script layer."}
                      </div>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={!selectedSegment || saveState.state === "saving"}
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saveState.state === "saving" ? "Saving..." : "Save spoken script"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                  Choose a saved project to open its persisted script layer.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Script</div>
                  <div className="mt-1 text-sm text-stone-500">
                    Real saved segment list from the selected project, with source and script layers side by side.
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
                    return (
                      <SegmentListCard
                        key={segment.id}
                        isActive={index === activeSegmentIndex}
                        index={index}
                        sourceText={segment.source_text}
                        literalText={segment.literal_mn}
                        spokenText={segment.spoken_mn}
                        characterLabel={character?.name}
                        viewMode={viewMode}
                        onSelect={() => selectSegmentIndex(index)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  Saved script segments will appear here after a project has transcript and translation records in the Phase 1 store.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
