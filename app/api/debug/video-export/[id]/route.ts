import { execFile } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"
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

const AUDIO_ONLY_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return NextResponse.json({ ok: false, errorCode: "NOT_FOUND", message: "Job not found." }, { status: 404 })
  }

  const mode = job.remixArtifacts?.mode || "keep_background"
  const mixedAudioPath = job.remixArtifacts?.mixedAudioPath
  if (!mixedAudioPath || !fs.existsSync(mixedAudioPath)) {
    return NextResponse.json(
      { ok: false, errorCode: "NO_MIXED_AUDIO", message: `No mixed audio output is available for the current ${mode} remix mode.` },
      { status: 400 }
    )
  }

  const sourceExtension = path.extname(job.sourceName || "").toLowerCase()
  if (AUDIO_ONLY_EXTENSIONS.has(sourceExtension)) {
    return NextResponse.json(
      { ok: false, errorCode: "AUDIO_ONLY_SOURCE", message: "This job uses an audio-only source. Video export is not available." },
      { status: 400 }
    )
  }

  const runDir = path.join(os.tmpdir(), "movie-tra", "runs", id)
  const sourcePath = path.join(runDir, job.sourceName)
  if (!fs.existsSync(sourcePath)) {
    return NextResponse.json(
      { ok: false, errorCode: "SOURCE_NOT_FOUND", message: "Original video source was not found for this job." },
      { status: 404 }
    )
  }

  const root = process.cwd()
  const ffmpegPath = await resolveBinary(root, ["ffmpeg.exe", "ffmpeg"], [{ name: "ffmpeg", args: ["-version"] }])
  if (!ffmpegPath) {
    return NextResponse.json(
      { ok: false, errorCode: "FFMPEG_NOT_FOUND", message: "ffmpeg was not found for video export." },
      { status: 500 }
    )
  }

  const exportDir = path.join(runDir, "final-export")
  fs.mkdirSync(exportDir, { recursive: true })
  const finalVideoPath = path.join(exportDir, "final-video.mp4")

  try {
    await runCommand(ffmpegPath, [
      "-y",
      "-i",
      sourcePath,
      "-i",
      mixedAudioPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      finalVideoPath,
    ])

    const exportReady = fs.existsSync(finalVideoPath)
    setJob(id, {
      ...job,
      remixArtifacts: {
        ...job.remixArtifacts,
        finalVideoPath: exportReady ? finalVideoPath : undefined,
        exportReady,
        warnings: [...(job.remixArtifacts?.warnings || [])],
      },
    })

    return NextResponse.json({
      ok: exportReady,
      jobId: id,
      mode,
      finalVideoPath: exportReady ? finalVideoPath : undefined,
      exportReady,
      warnings: job.remixArtifacts?.warnings || [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "VIDEO_EXPORT_ERROR",
        message: error instanceof Error ? error.message : "Final video export failed.",
      },
      { status: 500 }
    )
  }
}
