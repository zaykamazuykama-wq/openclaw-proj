import { execFile } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"
import { mixDubbedSegmentsForKeepBackground, mixDubbedSegmentsForReplaceMusic } from "@/lib/audio-remix"
import { getJob, setJob } from "@/lib/job-store"

type CommandResult = {
  stdout: string
  stderr: string
}

function runCommand(file: string, args: string[], cwd?: string, timeout = 1000 * 60 * 20): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 100,
        timeout,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error((stderr || stdout || error.message || "Command failed").trim()))
          return
        }
        resolve({ stdout, stderr })
      }
    )
  })
}

async function commandExists(command: string, args: string[] = ["--version"]) {
  try {
    await runCommand(command, args)
    return true
  } catch {
    return false
  }
}

function isCompatibleLocalBinary(binaryPath: string) {
  const extension = path.extname(binaryPath).toLowerCase()
  if (process.platform === "win32") return true
  return extension !== ".exe"
}

async function resolveBinary(root: string, localNames: string[], commandChecks: Array<{ name: string; args: string[] }>) {
  const localCandidates = localNames.flatMap((name) => [path.join(root, name), path.join(root, "..", name)])

  for (const localPath of localCandidates) {
    if (!fs.existsSync(localPath)) continue
    if (!isCompatibleLocalBinary(localPath)) continue

    const versionArgs = commandChecks[0]?.args || ["--version"]
    if (await commandExists(localPath, versionArgs)) {
      return localPath
    }
  }

  for (const check of commandChecks) {
    if (await commandExists(check.name, check.args)) {
      return check.name
    }
  }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return NextResponse.json({ ok: false, errorCode: "NOT_FOUND", message: "Job not found." }, { status: 404 })
  }

  const root = process.cwd()
  const ffmpegPath = await resolveBinary(root, ["ffmpeg.exe", "ffmpeg"], [{ name: "ffmpeg", args: ["-version"] }])
  if (!ffmpegPath) {
    return NextResponse.json(
      { ok: false, errorCode: "FFMPEG_NOT_FOUND", message: "ffmpeg was not found for final audio mixing." },
      { status: 500 }
    )
  }

  const dubbedDir = path.join(os.tmpdir(), "movie-tra", "runs", id, "dubbed-segments")
  if (!fs.existsSync(dubbedDir)) {
    return NextResponse.json(
      { ok: false, errorCode: "NO_DUBBED_SEGMENTS", message: "No persisted dubbed segment audio files are available for this job." },
      { status: 400 }
    )
  }

  const segments = Array.isArray(job.segments) ? job.segments : []
  const dubbedSegments = segments.flatMap((segment) => {
    const match = fs.readdirSync(dubbedDir).find((name) => name.startsWith(`${segment.segmentId}.`))
    if (!match) {
      return []
    }

    return [{
      segmentId: segment.segmentId,
      start: segment.start,
      audioPath: path.join(dubbedDir, match),
    }]
  })

  if (dubbedSegments.length === 0) {
    return NextResponse.json(
      { ok: false, errorCode: "NO_MATCHED_SEGMENTS", message: "Persisted dubbed segment files were not found for the prepared segments." },
      { status: 400 }
    )
  }

  try {
    const mixedDir = path.join(os.tmpdir(), "movie-tra", "runs", id, "mixed-audio")
    const { searchParams } = new URL(request.url)
    const requestedMode = searchParams.get("mode")
    const mode =
      requestedMode === "replace_music" || requestedMode === "keep_background"
        ? requestedMode
        : job.remixArtifacts?.mode || "keep_background"
    const mixResult =
      mode === "replace_music"
        ? await mixDubbedSegmentsForReplaceMusic({
            ffmpegPath,
            runCommand,
            outputDir: mixedDir,
            dubbedSegments,
            replacementMusicPath: job.remixArtifacts?.replacementMusicPath || "",
            ambienceStemPath: job.audioArtifacts?.ambienceStemPath,
          })
        : await mixDubbedSegmentsForKeepBackground({
            ffmpegPath,
            runCommand,
            outputDir: mixedDir,
            dubbedSegments,
            backgroundStemPath: job.audioArtifacts?.backgroundStemPath,
          })

    setJob(id, {
      ...job,
      remixArtifacts: {
        ...job.remixArtifacts,
        mode,
        mixedAudioPath: mixResult.mixedAudioPath,
        exportReady: mixResult.exportReady,
        fallbackUsed: mixResult.fallbackUsed,
        warnings: [...(job.remixArtifacts?.warnings || []), ...mixResult.warnings],
      },
    })

    return NextResponse.json({
      ok: mixResult.exportReady,
      jobId: id,
      mode,
      segmentsMixed: mixResult.segmentsMixed,
      usedBackground: mixResult.usedBackground,
      mixedAudioPath: mixResult.mixedAudioPath,
      warnings: mixResult.warnings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "REMIX_ERROR",
        message: error instanceof Error ? error.message : "Final audio mixing failed.",
      },
      { status: 500 }
    )
  }
}
