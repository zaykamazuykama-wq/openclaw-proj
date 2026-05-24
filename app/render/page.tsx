"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Clapperboard, Download, Film, Music4 } from "lucide-react"
import { StudioWorkflowNav } from "@/components/studio-workflow-nav"

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
    remix_mode?: "keep_background" | "replace_music"
    mixed_audio_path?: string
    replacement_music_path?: string
    final_video_path?: string
    export_ready?: boolean
  }
  render_jobs: Array<{
    id: string
    quality: "draft" | "final"
    status: "queued" | "running" | "done" | "failed"
    progress: number
  }>
}

function availabilityLabel(available: boolean) {
  return available ? "available" : "not ready"
}

function readProjectIdFromQuery() {
  if (typeof window === "undefined") return ""
  return new URLSearchParams(window.location.search).get("projectId")?.trim() || ""
}

export default function RenderPage() {
  const [projects, setProjects] = useState<StudioProjectSummary[]>([])
  const [queryProjectId] = useState(readProjectIdFromQuery)
  const [manualProjectId, setManualProjectId] = useState("")
  const [loadedBundle, setLoadedBundle] = useState<{
    projectId: string
    bundle: StudioProjectBundle | null
  } | null>(null)

  const effectiveProjectId = manualProjectId || queryProjectId || projects[0]?.id || ""
  const activeProjectBundle =
    effectiveProjectId && loadedBundle?.projectId === effectiveProjectId ? loadedBundle.bundle : null

  useEffect(() => {
    let cancelled = false

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

    void loadProjects()
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

  const project = activeProjectBundle?.project
  const mixedAudioAvailable = Boolean(project?.mixed_audio_path)
  const finalVideoAvailable = Boolean(project?.final_video_path)
  const replacementMusicAttached = Boolean(project?.replacement_music_path)
  const exportReady = Boolean(project?.export_ready || mixedAudioAvailable || finalVideoAvailable)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfaf5_0%,#f1e8d7_48%,#f7f4ed_100%)] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[32px] border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-stone-600">
                <Clapperboard className="h-3.5 w-3.5" />
                Render handoff
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                Project-backed dub handoff and export review
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">
                Review the saved remix/export state for a project, confirm output availability, and hand off draft or final files when they are ready.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-[420px] lg:grid-cols-1">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Current project</div>
                <div className="mt-1 text-sm font-medium text-stone-900">
                  {project?.title || "Choose a saved project"}
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Render jobs</div>
                <div className="mt-1 text-sm font-medium text-stone-900">
                  {activeProjectBundle?.render_jobs.length || 0}
                </div>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Focus</div>
                <div className="mt-1 text-sm font-medium text-stone-900">Saved outputs and final handoff</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stone-200 px-5 py-4 sm:px-6">
            <Link
              href={effectiveProjectId ? `/source?projectId=${encodeURIComponent(effectiveProjectId)}` : "/source"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open source
            </Link>
            <Link
              href={effectiveProjectId ? `/?projectId=${encodeURIComponent(effectiveProjectId)}#render` : "/#render"}
              className="rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            >
              Open live runtime actions
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
          activeStep="render"
          projectId={effectiveProjectId || undefined}
          projectTitle={activeProjectBundle?.project.title}
        />

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Render context</div>

              <select
                value={effectiveProjectId}
                onChange={(event) => setManualProjectId(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900"
              >
                {projects.length === 0 ? <option value="">No saved projects</option> : null}
                {projects.map((projectOption) => (
                  <option key={projectOption.id} value={projectOption.id}>
                    {projectOption.title}
                  </option>
                ))}
              </select>

              {project ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Remix mode</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {project.remix_mode || "keep_background"}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Mixed audio</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {availabilityLabel(mixedAudioAvailable)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Final video</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {availabilityLabel(finalVideoAvailable)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.16em] text-stone-500">Export ready</div>
                      <div className="mt-1 text-sm font-medium text-stone-900">
                        {exportReady ? "ready" : "not ready"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-stone-200 bg-white p-5">
                    <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                      <Music4 className="h-4 w-4" />
                      Saved output state
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Dubbed audio</div>
                        <div className="mt-2 text-stone-900">
                          {mixedAudioAvailable ? "Saved mixed audio is ready for handoff." : "No saved mixed audio yet."}
                        </div>
                        {project.mixed_audio_path ? (
                          <div className="mt-2 break-all text-xs text-stone-500">{project.mixed_audio_path}</div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Final video</div>
                        <div className="mt-2 text-stone-900">
                          {finalVideoAvailable ? "Saved final video is ready for delivery." : "No saved final video yet."}
                        </div>
                        {project.final_video_path ? (
                          <div className="mt-2 break-all text-xs text-stone-500">{project.final_video_path}</div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Replacement music</div>
                        <div className="mt-2 text-stone-900">
                          {replacementMusicAttached ? "Saved replacement music is attached." : "No replacement music saved."}
                        </div>
                        {project.replacement_music_path ? (
                          <div className="mt-2 break-all text-xs text-stone-500">{project.replacement_music_path}</div>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">Saved readiness</div>
                        <div className="mt-2 text-stone-900">
                          {exportReady
                            ? "This project has saved output state ready for final handoff."
                            : "This project still needs runtime remix/export work before handoff."}
                        </div>
                      </div>
                    </div>

                    {(mixedAudioAvailable || finalVideoAvailable) && effectiveProjectId ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {mixedAudioAvailable ? (
                          <a
                            href={`/api/debug/mixed-audio/${effectiveProjectId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700"
                          >
                            <Music4 className="h-4 w-4" />
                            Preview or download mixed audio
                          </a>
                        ) : null}
                        {finalVideoAvailable ? (
                          <a
                            href={`/api/debug/final-video/${effectiveProjectId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700"
                          >
                            <Film className="h-4 w-4" />
                            Preview or download final video
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
                  Choose a saved project to open its persisted render handoff state.
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Saved render jobs</div>
                  <div className="mt-1 text-sm text-stone-500">
                    Project-backed render history and saved output availability come first here.
                  </div>
                </div>
                <div className="text-sm text-stone-500">
                  {activeProjectBundle?.render_jobs.length ? `${activeProjectBundle.render_jobs.length} jobs` : "No saved jobs"}
                </div>
              </div>

              {activeProjectBundle?.render_jobs.length ? (
                <div className="space-y-3">
                  {activeProjectBundle.render_jobs.map((job) => (
                    <div key={job.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-stone-900">{job.quality} render</div>
                          <div className="mt-1 text-xs text-stone-500">{job.id}</div>
                        </div>
                        <div className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-medium text-stone-700">
                          {job.status}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-stone-900"
                          style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-stone-500">{job.progress || 0}% complete</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-500">
                  Saved render jobs will appear here after the project has gone through remix/export work.
                </div>
              )}

              <div className="mt-5 rounded-[28px] border border-stone-200 bg-white p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-stone-500">
                  <Download className="h-4 w-4" />
                  Runtime-only details
                </div>
                <div className="text-sm leading-7 text-stone-600">
                  Live remix/export actions, debug warnings, and refreshable runtime state still live in the main workspace for now. This page keeps saved project-backed handoff state primary and pushes runtime/debug detail into a secondary place.
                </div>
                <div className="mt-4">
                  <Link
                    href={effectiveProjectId ? `/?projectId=${encodeURIComponent(effectiveProjectId)}#render` : "/#render"}
                    className="inline-flex rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
                  >
                    Open runtime remix/export panel
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
