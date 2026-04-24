"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Globe2, Play, SlidersHorizontal } from "lucide-react"
import { getVoiceLibrary, type VoiceLibraryVoice } from "@/lib/voice-library"
import { matchVoiceToSpeaker, type SpeakerVoiceTraits } from "@/lib/voice-matcher"

type TestState = {
  status: "idle" | "loading" | "success" | "error"
  message?: string
  contentType?: string
  byteLength?: number
}

const VOICES = getVoiceLibrary()

function uniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort()
}

export default function VoiceLibraryPage() {
  const [disabledVoiceIds, setDisabledVoiceIds] = useState<string[]>([])
  const [genderFilter, setGenderFilter] = useState("all")
  const [ageFilter, setAgeFilter] = useState("all")
  const [toneFilter, setToneFilter] = useState("all")
  const [energyFilter, setEnergyFilter] = useState("all")
  const [archetypeFilter, setArchetypeFilter] = useState("all")
  const [previewStates, setPreviewStates] = useState<Record<string, TestState>>({})

  const visibleVoices = useMemo(() => {
    return VOICES.filter((voice) => {
      const enabledNow = !disabledVoiceIds.includes(voice.id) && voice.enabled
      if (!enabledNow) return false
      if (genderFilter !== "all" && voice.gender !== genderFilter) return false
      if (ageFilter !== "all" && voice.ageGroup !== ageFilter) return false
      if (toneFilter !== "all" && voice.toneProfile !== toneFilter) return false
      if (energyFilter !== "all" && voice.energyProfile !== energyFilter) return false
      if (archetypeFilter !== "all" && !voice.archetypes.includes(archetypeFilter)) return false
      return true
    })
  }, [ageFilter, archetypeFilter, disabledVoiceIds, energyFilter, genderFilter, toneFilter])

  const liveMatchInput: SpeakerVoiceTraits = {
    detectedGender: genderFilter === "all" ? undefined : (genderFilter as SpeakerVoiceTraits["detectedGender"]),
    detectedAgeGroup: ageFilter === "all" ? undefined : (ageFilter as SpeakerVoiceTraits["detectedAgeGroup"]),
    detectedTone: toneFilter === "all" ? undefined : (toneFilter as SpeakerVoiceTraits["detectedTone"]),
    detectedEnergy: energyFilter === "all" ? undefined : (energyFilter as SpeakerVoiceTraits["detectedEnergy"]),
    characterLabel: archetypeFilter === "all" ? undefined : archetypeFilter,
  }

  const liveMatch = useMemo(() => matchVoiceToSpeaker(liveMatchInput, visibleVoices), [liveMatchInput, visibleVoices])

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

  const archetypes = uniqueValues(VOICES.flatMap((voice) => voice.archetypes))

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
              Local enable/disable toggles apply to this page session only. Provider preview stays server-side and no audio is persisted.
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <section className="space-y-6">
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
                  {uniqueValues(VOICES.map((voice) => voice.toneProfile)).map((value) => (
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
