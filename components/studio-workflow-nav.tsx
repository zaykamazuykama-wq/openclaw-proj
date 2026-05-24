"use client"

import Link from "next/link"

export type StudioWorkflowStep = "source" | "script" | "cast" | "performance" | "render"

type StudioWorkflowNavProps = {
  activeStep: StudioWorkflowStep
  projectId?: string
  projectTitle?: string
}

const STEPS: Array<{
  id: StudioWorkflowStep
  label: string
  caption: string
}> = [
  { id: "source", label: "Source", caption: "Upload and review" },
  { id: "script", label: "Script", caption: "Literal and spoken Mongolian" },
  { id: "cast", label: "Cast", caption: "Character voice ensemble" },
  { id: "performance", label: "Performance", caption: "Direction by segment" },
  { id: "render", label: "Render", caption: "Draft and export" },
]

function buildStepHref(step: StudioWorkflowStep, projectId?: string) {
  const encodedProjectId = projectId ? encodeURIComponent(projectId) : ""

  switch (step) {
    case "source":
      return projectId ? `/source?projectId=${encodedProjectId}` : "/source"
    case "script":
      return projectId ? `/script?projectId=${encodedProjectId}` : "/script"
    case "cast":
      return projectId ? `/voice-library?projectId=${encodedProjectId}` : "/voice-library"
    case "performance":
      return projectId ? `/performance?projectId=${encodedProjectId}` : "/performance"
    case "render":
      return projectId ? `/render?projectId=${encodedProjectId}` : "/render"
    default:
      return "/"
  }
}

export function StudioWorkflowNav({
  activeStep,
  projectId,
  projectTitle,
}: StudioWorkflowNavProps) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            Studio workflow
          </div>
          <div className="mt-1 text-sm text-stone-500">
            Source, script, cast, performance, and render stay connected to the same saved project.
          </div>
        </div>
        {projectTitle ? (
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Current project
            </span>
            <div className="mt-1 font-medium text-stone-900">{projectTitle}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {STEPS.map((step, index) => {
          const isActive = step.id === activeStep

          return (
            <Link
              key={step.id}
              href={buildStepHref(step.id, projectId)}
              className={`rounded-[24px] border p-4 transition ${
                isActive
                  ? "border-amber-300 bg-[linear-gradient(180deg,#fffaf0_0%,#fff1cd_100%)] shadow-sm"
                  : "border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Step {index + 1}
              </div>
              <div className="mt-2 text-base font-semibold text-stone-950">{step.label}</div>
              <div className="mt-1 text-sm leading-6 text-stone-600">{step.caption}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
