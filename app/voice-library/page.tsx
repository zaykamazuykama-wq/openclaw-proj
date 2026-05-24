"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Globe2, Play, SlidersHorizontal } from "lucide-react"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"
import { getVoiceLibrary, type VoiceLibraryVoice } from "@/lib/voice-library"
import { matchVoiceToSpeaker, type SpeakerVoiceTraits } from "@/lib/voice-matcher"
import type { VoiceId } from "@/lib/voice-selector"

type TestState = {
  status: "idle" | "loading" | "success" | "error"
  message?: string
  contentType?: string
  byteLength?: number
}

type SeededVoiceRecord = {
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
}

const LIBRARY_VOICES = getVoiceLibrary()

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort()
}

function mapSeedAgeFeelToAgeGroup(value: SeededVoiceRecord["age_feel"]): VoiceLibraryVoice["ageGroup"] {
  if (value === "young") return "young_adult"
  if (value === "mature") return "mature"
  return "adult"
}

function mapSeedToTone(seed: SeededVoiceRecord): VoiceLibraryVoice["toneProfile"] {
  if (seed.softness >= 80) return "soft"
  if (seed.warmth >= 80) return "warm"
  if (seed.brightness >= 80) return "bright"
  if (seed.brightness <= 35) return "deep"
  return "neutral"
}

function mapSeedToEnergy(seed: SeededVoiceRecord): VoiceLibraryVoice["energyProfile"] {
  if (seed.energy >= 75) return "high"
  if (seed.energy <= 40) return "low"
  return "medium"
}

function mapSeedToPitch(seed: SeededVoiceRecord): VoiceLibraryVoice["pitchProfile"] {
  if (seed.gender === "female") return seed.brightness >= 75 ? "mid_high" : "mid"
  return seed.brightness <= 35 ? "low" : "mid_low"
}

function createVoiceCardFromSeed(seed: SeededVoiceRecord): VoiceLibraryVoice {
  const reference =
    LIBRARY_VOICES
      .filter((voice) => voice.baseVoiceId === (seed.id as VoiceId))
      .sort((a, b) => b.priority - a.priority)[0] || null

  return {
    id: reference?.id || `seed_${seed.id.toLowerCase()}`,
    displayName: seed.display_name,
    provider: reference?.provider || (seed.elevenlabs_voice_id ? "elevenlabs" : "custom"),
    providerVoiceId: reference?.providerVoiceId || seed.elevenlabs_voice_id || seed.id,
    baseVoiceId: seed.id as VoiceId,
    language: "mn",
    gender: reference?.gender || seed.gender,
    ageGroup: reference?.ageGroup || mapSeedAgeFeelToAgeGroup(seed.age_feel),
    pitchProfile: reference?.pitchProfile || mapSeedToPitch(seed),
    toneProfile: reference?.toneProfile || mapSeedToTone(seed),
    energyProfile: reference?.energyProfile || mapSeedToEnergy(seed),
    paceProfile: reference?.paceProfile || "medium",
    emotionRange: reference?.emotionRange || ["neutral", "serious", "happy"],
    archetypes: reference?.archetypes || [seed.gender === "female" ? "female lead" : "male lead"],
    useCases: reference?.useCases || [seed.best_for || "dialogue dubbing"],
    sampleTextMn: reference?.sampleTextMn || "Сайн байна уу. Энэ бол монгол дуббингийн туршилтын жишээ юм.",
    enabled: reference?.enabled ?? true,
    priority: reference?.priority ?? 100,
    notes: reference?.notes || seed.best_for || "Seeded Phase 1 voice bank entry.",
  }
}

function readProjectIdFromQuery() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("projectId")?.trim() || ""
}

export default function VoiceLibraryPage() {
  const [disabledVoiceIds, setDisabledVoiceIds] = useState<string[]>([])
  const [seededVoices, setSeededVoices] = useState<SeededVoiceRecord[]>([])
  const [projects, setProjects] = useState<StudioProjectSummary[]>([])
  const [queryProjectId] = useState(readProjectIdFromQuery)
  const [manualProjectId, setManualProjectId] = useState("")
  const [loadedBundle, setLoadedBundle] = useState<{
    projectId: string
    bundle: StudioProjectBundle | null
  } | null>(null)
  const [draftOverrides, setDraftOverrides] = useState<Record<string, { name: string; voiceId: string }>>({})
  const [draftOverrideScope, setDraftOverrideScope] = useState("")
  const [characterSaveState, setCharacterSaveState] = useState<
    Record<string, { state: "idle" | "saving" | "saved" | "error"; message?: string }>
  >({})
  const [characterSaveScope, setCharacterSaveScope] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [toneFilter, setToneFilter] = useState("all")
  const [energyFilter, setEnergyFilter] = useState("all")
  const [archetypeFilter, setArchetypeFilter] = useState("all")
  const [previewStates, setPreviewStates] = useState<Record<string, TestState>>({})

  const effectiveProjectId = manualProjectId || queryProjectId || projects[0]?.id || ""
  const activeProjectBundle =
    effectiveProjectId && loadedBundle?.projectId === effectiveProjectId ? loadedBundle.bundle : null

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      try {
        const [voicesResponse, projectsResponse] = await Promise.all([
          fetch("/api/voices"),
          fetch("/api/projects"),
        ])
        const [voicesData, projectsData] = await Promise.all([
          voicesResponse.json(),
          projectsResponse.json(),
        ])
        if (!cancelled) {
          setSeededVoices(Array.isArray(voicesData?.voices) ? voicesData.voices : [])
          setProjects(Array.isArray(projectsData?.projects) ? projectsData.projects : [])
        }
      } catch {
        if (!cancelled) {
          setSeededVoices([])
          setProjects([])
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

  const persistedCharacterDrafts = useMemo(
    () =>
      Object.fromEntries(
        (activeProjectBundle?.characters || []).map((character) => [
          character.id,
          {
            name: character.name,
            voiceId: character.voice_id || "",
          },
        ])
      ),
    [activeProjectBundle?.characters]
  )

  const characterScopeKey = useMemo(
    () =>
      activeProjectBundle?.characters
        .map((character) => `${character.id}:${character.name}:${character.voice_id ?? ""}`)
        .join("|") ?? "",
    [activeProjectBundle?.characters]
  )

  const characterDrafts = useMemo(() => {
    if (draftOverrideScope !== characterScopeKey) {
      return persistedCharacterDrafts
    }
    return { ...persistedCharacterDrafts, ...draftOverrides }
  }, [characterScopeKey, draftOverrideScope, draftOverrides, persistedCharacterDrafts])

  const visibleCharacterSaveState =
    characterSaveScope === characterScopeKey ? characterSaveState : {}

  function updateCharacterDraft(
    characterId: string,
    character: StudioProjectBundle["characters"][number],
    patch: Partial<{ name: string; voiceId: string }>
  ) {
    const baseDrafts =
      draftOverrideScope === characterScopeKey
        ? { ...persistedCharacterDrafts, ...draftOverrides }
        : persistedCharacterDrafts
    const currentDraft = baseDrafts[characterId] || {
      name: character.name,
      voiceId: character.voice_id || "",
    }

    setDraftOverrideScope(characterScopeKey)
    setDraftOverrides((current) => ({
      ...(draftOverrideScope === characterScopeKey ? current : {}),
      [characterId]: {
        name: patch.name ?? currentDraft.name,
        voiceId: patch.voiceId ?? currentDraft.voiceId,
      },
    }))
  }

  const seededVoiceMap = useMemo(
    () => new Map(seededVoices.map((voice) => [voice.id, voice])),
    [seededVoices]
  )
  const voiceNameById = useMemo(
    () => Object.fromEntries(seededVoices.map((voice) => [voice.id, voice.display_name])),
    [seededVoices]
  )

  const voicePool = useMemo(() => {
    if (seededVoices.length === 0) return LIBRARY_VOICES
    return seededVoices.map((voice) => createVoiceCardFromSeed(voice))
  }, [seededVoices])

  const visibleVoices = useMemo(() => {
    return voicePool.filter((voice) => {
      const enabledNow = !disabledVoiceIds.includes(voice.id) && voice.enabled
      if (!enabledNow) return false
      if (genderFilter !== "all" && voice.gender !== genderFilter) return false
      if (ageFilter !== "all" && voice.ageGroup !== ageFilter) return false
      if (toneFilter !== "all" && voice.toneProfile !== toneFilter) return false
      if (energyFilter !== "all" && voice.energyProfile !== energyFilter) return false
      if (archetypeFilter !== "all" && !voice.archetypes.includes(archetypeFilter)) return false
      return true
    })
  }, [ageFilter, archetypeFilter, disabledVoiceIds, energyFilter, genderFilter, toneFilter, voicePool])

  const liveMatch = useMemo(() => {
    const liveMatchInput: SpeakerVoiceTraits = {
      detectedGender: genderFilter === "all" ? undefined : (genderFilter as SpeakerVoiceTraits["detectedGender"]),
      detectedAgeGroup: ageFilter === "all" ? undefined : (ageFilter as SpeakerVoiceTraits["detectedAgeGroup"]),
      detectedTone: toneFilter === "all" ? undefined : (toneFilter as SpeakerVoiceTraits["detectedTone"]),
      detectedEnergy: energyFilter === "all" ? undefined : (energyFilter as SpeakerVoiceTraits["detectedEnergy"]),
      characterLabel: archetypeFilter === "all" ? undefined : archetypeFilter,
    }

    return matchVoiceToSpeaker(liveMatchInput, visibleVoices.length > 0 ? visibleVoices : voicePool)
  }, [ageFilter, archetypeFilter, energyFilter, genderFilter, toneFilter, visibleVoices, voicePool])

  async function testVoice(voice: VoiceLibraryVoice) {
    if (!voice.baseVoiceId) {
      setPreviewStates((current) => ({
        ...current,
        [voice.id]: { status: "error", message: "Voice preview unavailable: no base voice id configured." },
      }))
      return
    }

    setPreviewStates((current) => ({
      ...current,
      [voice.id]: { status: "loading", message: "Testing short Mongolian sample..." },
    }))

    try {
      const response = await fetch(`/api/debug/elevenlabs-smoke?baseVoiceId=${voice.baseVoiceId}`)
      const data = await response.json()

      if (!data.ok) {
        setPreviewStates((current) => ({
          ...current,
          [voice.id]: { status: "error", message: data.errorMessage || "Voice preview unavailable." },
        }))
        return
      }

      setPreviewStates((current) => ({
        ...current,
        [voice.id]: {
          status: "success",
          message: "Voice preview request succeeded.",
          contentType: data.contentType,
          byteLength: data.byteLength,
        },
      }))
    } catch (error) {
      setPreviewStates((current) => ({
        ...current,
        [voice.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "Voice preview unavailable.",
        },
      }))
    }
  }

  function toggleVoice(id: string) {
    setDisabledVoiceIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const archetypes = uniqueValues(voicePool.flatMap((voice) => voice.archetypes))

  async function saveCharacter(characterId: string) {
    if (!activeProjectBundle?.project.id) return
    const draft = characterDrafts[characterId]
    if (!draft || !draft.name.trim()) {
      setCharacterSaveScope(characterScopeKey)
      setCharacterSaveState((current) => ({
        ...(characterSaveScope === characterScopeKey ? current : {}),
        [characterId]: { state: "error", message: "Character name is required." },
      }))
      return
    }

    setCharacterSaveScope(characterScopeKey)
    setCharacterSaveState((current) => ({
      ...(characterSaveScope === characterScopeKey ? current : {}),
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
          ...(characterSaveScope === characterScopeKey ? current : {}),
          [characterId]: { state: "error", message: data?.message || "Save failed." },
        }))
        return
      }

      setLoadedBundle({ projectId: activeProjectBundle.project.id, bundle: data.bundle })
      setDraftOverrides({})
      setDraftOverrideScope(
        data.bundle.characters
          .map((character: StudioProjectBundle["characters"][number]) =>
            `${character.id}:${character.name}:${character.voice_id ?? ""}`
          )
          .join("|")
      )
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
      setCharacterSaveState((current) => ({
        ...(characterSaveScope === characterScopeKey ? current : {}),
        [characterId]: { state: "saved", message: "Saved." },
      }))
    } catch (error) {
      setCharacterSaveState((current) => ({
        ...(characterSaveScope === characterScopeKey ? current : {}),
        [characterId]: { state: "error", message: error instanceof Error ? error.message : "Save failed." },
      }))
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f1e8d7_48%,#f7f4ed_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Globe2 className="h-3.5 w-3.5" />
                Character voice library
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Similar Mongolian voice matching</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                A curated internal library of Mongolian dubbing voices for best-fit matching by gender, age, tone, energy, pace, and character archetype.
              </p>
            </div>

            <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              Phase 1 seeded voices: {seededVoices.length > 0 ? seededVoices.length : "fallback catalog only"}. Local enable/disable toggles apply to this page session only. Provider preview stays server-side and no audio is persisted.
            </div>
          </div>
        </header>

        <StudioWorkflowNav
          activeStep="cast"
          projectId={effectiveProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Cast</div>
                    <div className="mt-1 text-sm text-stone-500">
                      Real persisted project-backed cast assignments using the current Phase 1 store.
                    </div>
                  </div>
                  <div className="text-sm text-stone-500">
                    {activeProjectBundle?.characters.length ? `${activeProjectBundle.characters.length} characters` : "No cast loaded"}
                  </div>
                </div>

                <select
                  value={effectiveProjectId}
                  onChange={(event) => setManualProjectId(event.target.value)}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
                >
                  {projects.length === 0 ? <option value="">No saved projects</option> : null}
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>

                {activeProjectBundle ? (
                  <div className="space-y-3">
                    {activeProjectBundle.characters.length > 0 ? (
                      activeProjectBundle.characters.map((character) => (
                        <div key={character.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                            <input
                              type="text"
                              value={characterDrafts[character.id]?.name || ""}
                              onChange={(event) =>
                                updateCharacterDraft(character.id, character, { name: event.target.value })
                              }
                              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900"
                            />
                            <select
                              value={characterDrafts[character.id]?.voiceId || ""}
                              onChange={(event) =>
                                updateCharacterDraft(character.id, character, { voiceId: event.target.value })
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
                            <button
                              type="button"
                              onClick={() => void saveCharacter(character.id)}
                              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                            >
                              {visibleCharacterSaveState[character.id]?.state === "saving" ? "Saving..." : "Save"}
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-stone-500">
                            {character.source_label} · {character.segment_count} segments ·{" "}
                            {character.voice_id ? `Assigned voice: ${voiceNameById[character.voice_id] || character.voice_id}` : "Voice assignment pending"}
                          </div>
                          {visibleCharacterSaveState[character.id]?.message ? (
                            <div
                              className={`mt-2 text-xs ${
                                visibleCharacterSaveState[character.id]?.state === "error" ? "text-red-600" : "text-stone-500"
                              }`}
                            >
                              {visibleCharacterSaveState[character.id]?.message}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                        This saved project does not have character records yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                    Choose a saved project to edit its persisted cast.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <option value="all">All genders</option>
                  <option value="female">female</option>
                  <option value="male">male</option>
                  <option value="child">child</option>
                  <option value="neutral">neutral</option>
                </select>
                <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <option value="all">All age groups</option>
                  <option value="child">child</option>
                  <option value="teen">teen</option>
                  <option value="young_adult">young_adult</option>
                  <option value="adult">adult</option>
                  <option value="mature">mature</option>
                  <option value="elder">elder</option>
                </select>
                <select value={toneFilter} onChange={(e) => setToneFilter(e.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <option value="all">All tones</option>
                  {uniqueValues(voicePool.map((voice) => voice.toneProfile)).map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select value={energyFilter} onChange={(e) => setEnergyFilter(e.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm">
                  <option value="all">All energy</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
                <select value={archetypeFilter} onChange={(e) => setArchetypeFilter(e.target.value)} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm sm:col-span-2">
                  <option value="all">All archetypes</option>
                  {archetypes.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Best Mongolian dubbing match</div>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">{liveMatch.selectedVoice.displayName}</h2>
              <p className="mt-2 text-sm leading-7 text-stone-600">{liveMatch.selectedVoice.notes}</p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {[liveMatch.selectedVoice.gender, liveMatch.selectedVoice.ageGroup, liveMatch.selectedVoice.pitchProfile, liveMatch.selectedVoice.toneProfile, liveMatch.selectedVoice.energyProfile, liveMatch.selectedVoice.paceProfile].map((tag) => (
                  <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-700">{tag}</span>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <div className="font-medium text-stone-900">Why it matched</div>
                <ul className="mt-2 space-y-1">
                  {liveMatch.scoreBreakdown.reasons.length > 0 ? liveMatch.scoreBreakdown.reasons.map((reason) => <li key={reason}>- {reason}</li>) : <li>- Neutral Mongolian fallback</li>}
                </ul>
              </div>

              <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <div className="font-medium text-stone-900">Candidate shortlist</div>
                <div className="mt-2 space-y-2">
                  {liveMatch.shortlist.map((candidate) => (
                    <div key={candidate.voice.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                      <span>{candidate.voice.displayName}</span>
                      <span className="font-medium text-stone-900">{candidate.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {visibleVoices.map((voice) => {
              const isEnabledNow = !disabledVoiceIds.includes(voice.id) && voice.enabled
              const previewState = previewStates[voice.id] || { status: "idle" as const }
              const seededVoice = voice.baseVoiceId ? seededVoiceMap.get(voice.baseVoiceId) : undefined

              return (
                <div key={voice.id} className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Voice style match</div>
                      <h3 className="mt-2 text-2xl font-semibold text-stone-950">{voice.displayName}</h3>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {[voice.gender, voice.ageGroup, voice.pitchProfile, voice.toneProfile, voice.energyProfile, voice.paceProfile].map((tag) => (
                          <span key={tag} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-stone-700">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVoice(voice.id)}
                        className={`rounded-full px-4 py-2 text-sm font-medium ${isEnabledNow ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700"}`}
                      >
                        {isEnabledNow ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        type="button"
                        onClick={() => testVoice(voice)}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700"
                      >
                        <Play className="h-4 w-4" />
                        Test
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <div className="font-medium text-stone-900">Archetypes</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {voice.archetypes.map((item) => (
                          <span key={item} className="rounded-full bg-white px-3 py-1 text-xs">{item}</span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                      <div className="font-medium text-stone-900">Provider</div>
                      <div className="mt-2">{voice.provider}</div>
                      <div className="mt-1 break-all text-xs text-stone-500">{voice.providerVoiceId}</div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    <div className="font-medium text-stone-900">Seeded Phase 1 record</div>
                    {seededVoice ? (
                      <div className="mt-2 space-y-1">
                        <div>{seededVoice.display_name}</div>
                        <div className="text-xs text-stone-500">
                          {seededVoice.gender} · {seededVoice.age_feel} · Piper {seededVoice.piper_model || "unassigned"}
                        </div>
                        <div className="text-xs text-stone-500">
                          Warmth {seededVoice.warmth} · Brightness {seededVoice.brightness} · Softness {seededVoice.softness} · Energy {seededVoice.energy}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-stone-500">This voice card is not currently backed by a seeded Phase 1 voice record.</div>
                    )}
                  </div>

                  <details className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-stone-900">Inspect details</summary>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
                      <div><span className="font-medium text-stone-900">Use cases:</span> {voice.useCases.join(", ")}</div>
                      <div><span className="font-medium text-stone-900">Emotion range:</span> {voice.emotionRange.join(", ")}</div>
                      <div><span className="font-medium text-stone-900">Sample text:</span> {voice.sampleTextMn}</div>
                      <div><span className="font-medium text-stone-900">Notes:</span> {voice.notes}</div>
                    </div>
                  </details>

                  <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                    {previewState.status === "idle" && "Voice preview unavailable until you press Test."}
                    {previewState.status === "loading" && previewState.message}
                    {previewState.status === "error" && `Voice preview unavailable. ${previewState.message}`}
                    {previewState.status === "success" &&
                      `Sample preview succeeded. ${previewState.contentType || "audio"}${previewState.byteLength ? `, ${previewState.byteLength} bytes` : ""}.`}
                  </div>
                </div>
              )
            })}
          </section>
        </div>

        <div className="flex justify-start">
          <Link href="/" className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700">
            Back to main workspace
          </Link>
        </div>
      </div>
    </main>
  )
}
