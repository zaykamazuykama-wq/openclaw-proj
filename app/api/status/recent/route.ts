import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"
import type { ProcessingResult } from "@/lib/types"

type RecentJobSummary = {
  jobId: string
  updatedAt: string
  sourceName: string
  sourceType: ProcessingResult["sourceType"]
  stage: ProcessingResult["stage"]
  remixMode?: string
  mixedAudioReady: boolean
  finalVideoReady: boolean
}

export async function GET() {
  const runsDir = path.join(os.tmpdir(), "movie-tra", "runs")
  if (!fs.existsSync(runsDir)) {
    return NextResponse.json({ jobs: [] as RecentJobSummary[] })
  }

  const jobs = fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const filePath = path.join(runsDir, entry.name, "job-result.json")
      if (!fs.existsSync(filePath)) return []

      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ProcessingResult
        const stats = fs.statSync(filePath)
        return [
          {
            jobId: entry.name,
            updatedAt: stats.mtime.toISOString(),
            sourceName: parsed.sourceName || "Unknown source",
            sourceType: parsed.sourceType || "",
            stage: parsed.stage,
            remixMode: parsed.remixArtifacts?.mode,
            mixedAudioReady: Boolean(parsed.remixArtifacts?.mixedAudioPath),
            finalVideoReady: Boolean(parsed.remixArtifacts?.finalVideoPath),
          } satisfies RecentJobSummary,
        ]
      } catch {
        return []
      }
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)

  return NextResponse.json({ jobs })
}
