import { execFile } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { mixDubbedSegmentsForKeepBackground, mixDubbedSegmentsForReplaceMusic } from "@/lib/audio-remix"
import { getJob, setJob } from "@/lib/job-store"
import { mergeRemixArtifacts, normalizeRemixMode, type RemixMode } from "@/lib/remix-artifacts"
import type { TranscriptSegment } from "@/lib/types"

type CommandResult = {
  stdout: string
  stderr: string
}

type WorkerRouteResult<TBody> = {
  status: number
  body: TBody
}

type RemixRequest = {
  jobId: string
  mode?: RemixMode | string
}

type VideoExportRequest = {
  jobId: string
}

type RemixResponseBody =
  | {
      ok: true
      jobId: string
      mode: RemixMode
      segmentsMixed: number
      usedBackground: boolean
      mixedAudioPath: string
      warnings: string[]
    }
  | {
      ok: false
      errorCode: string
      message: string
    }

type VideoExportResponseBody =
  | {
      ok: true
      jobId: string
      mode: RemixMode
      finalVideoPath?: string
      exportReady: boolean
      warnings: string[]
    }
  | {
      ok: false
      errorCode: string
      message: string
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

function getWorkerBaseUrl() {
  return process.env.WORKER_BASE_URL?.trim() || ""
}

function getSegmentAudioId(segment: TranscriptSegment, index: number) {
  const maybeSegmentId = (segment as TranscriptSegment & { segmentId?: unknown }).segmentId
  if (typeof maybeSegmentId === "string" && maybeSegmentId.trim()) {
    return maybeSegmentId.trim()
  }

  return `segment-${String(index + 1).padStart(4, "0")}`
}

function getSupportedLocalRemixMode(mode?: string | null): {
  mode: Exclude<RemixMode, "voice_plus_ambience">
  warnings: string[]
} {
  const normalizedMode = normalizeRemixMode(mode)
  if (normalizedMode === "voice_plus_ambience") {
    return {
      mode: "keep_background",
      warnings: [
        "Voice-plus-ambience remix is not supported by the local Sprint 0 renderer yet. Falling back to keep-background remix.",
      ],
    }
  }

  return {
    mode: normalizedMode,
    warnings: [],
  }
}

async function callWorker<TRequest, TResponse>(
  workerPath: string,
  payload: TRequest
): Promise<WorkerRouteResult<TResponse>> {
  const baseUrl = getWorkerBaseUrl()
  if (!baseUrl) {
    throw new Error("Worker base URL is not configured.")
  }

  const secret = process.env.WORKER_SHARED_SECRET?.trim()
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${workerPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { "X-Worker-Secret": secret } : {}),
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as TResponse
  return {
    status: response.status,
    body: data,
  }
}

async function runRemixLocal({ jobId, mode: requestedMode }: RemixRequest): Promise<WorkerRouteResult<RemixResponseBody>> {
  const job = getJob(jobId)

  if (!job) {
    return {
      status: 404,
      body: { ok: false, errorCode: "NOT_FOUND", message: "Job not found." },
    }
  }

  const root = process.cwd()
  const ffmpegPath = await resolveBinary(root, ["ffmpeg.exe", "ffmpeg"], [{ name: "ffmpeg", args: ["-version"] }])
  if (!ffmpegPath) {
    return {
      status: 500,
      body: {
        ok: false,
        errorCode: "FFMPEG_NOT_FOUND",
        message: "ffmpeg was not found for final audio mixing.",
      },
    }
  }

  const dubbedDir = path.join(os.tmpdir(), "movie-tra", "runs", jobId, "dubbed-segments")
  if (!fs.existsSync(dubbedDir)) {
    return {
      status: 400,
      body: {
        ok: false,
        errorCode: "NO_DUBBED_SEGMENTS",
        message: "No persisted dubbed segment audio files are available for this job.",
      },
    }
  }

  const segments = Array.isArray(job.segments) ? job.segments : []
  const dubbedFiles = fs.readdirSync(dubbedDir)
  const dubbedSegments = segments.flatMap((segment, index) => {
    const segmentId = getSegmentAudioId(segment, index)
    const match = dubbedFiles.find((name) => name.startsWith(`${segmentId}.`))
    if (!match) {
      return []
    }

    return [{
      segmentId,
      start: segment.start,
      audioPath: path.join(dubbedDir, match),
    }]
  })

  if (dubbedSegments.length === 0) {
    return {
      status: 400,
      body: {
        ok: false,
        errorCode: "NO_MATCHED_SEGMENTS",
        message: "Persisted dubbed segment files were not found for the prepared segments.",
      },
    }
  }

  try {
    const mixedDir = path.join(os.tmpdir(), "movie-tra", "runs", jobId, "mixed-audio")
    const requested = requestedMode || job.remixArtifacts?.mode
    const { mode, warnings: modeWarnings } = getSupportedLocalRemixMode(requested)
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

    setJob(jobId, {
      ...job,
      remixArtifacts: mergeRemixArtifacts(
        job.remixArtifacts,
        {
          mode,
          dubbedSegmentAudioPaths: dubbedSegments.map((segment) => segment.audioPath),
          mixedAudioPath: mixResult.mixedAudioPath,
          exportReady: mixResult.exportReady,
          fallbackUsed: mixResult.fallbackUsed,
          warnings: [...(job.remixArtifacts?.warnings || []), ...modeWarnings, ...mixResult.warnings],
        },
        segments.length
      ),
    })

    if (!mixResult.mixedAudioPath) {
      return {
        status: 500,
        body: {
          ok: false,
          errorCode: "REMIX_OUTPUT_MISSING",
          message: "Final audio mixing finished but no mixed audio file was created.",
        },
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        jobId,
        mode,
        segmentsMixed: mixResult.segmentsMixed,
        usedBackground: mixResult.usedBackground,
        mixedAudioPath: mixResult.mixedAudioPath,
        warnings: [...modeWarnings, ...mixResult.warnings],
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        errorCode: "REMIX_ERROR",
        message: error instanceof Error ? error.message : "Final audio mixing failed.",
      },
    }
  }
}

const AUDIO_ONLY_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"])

async function runVideoExportLocal({ jobId }: VideoExportRequest): Promise<WorkerRouteResult<VideoExportResponseBody>> {
  const job = getJob(jobId)

  if (!job) {
    return {
      status: 404,
      body: { ok: false, errorCode: "NOT_FOUND", message: "Job not found." },
    }
  }

  const { mode, warnings: modeWarnings } = getSupportedLocalRemixMode(job.remixArtifacts?.mode)
  const mixedAudioPath = job.remixArtifacts?.mixedAudioPath
  if (!mixedAudioPath || !fs.existsSync(mixedAudioPath)) {
    return {
      status: 400,
      body: {
        ok: false,
        errorCode: "NO_MIXED_AUDIO",
        message: `No mixed audio output is available for the current ${mode} remix mode.`,
      },
    }
  }

  const sourceExtension = path.extname(job.sourceName || "").toLowerCase()
  if (AUDIO_ONLY_EXTENSIONS.has(sourceExtension)) {
    return {
      status: 400,
      body: {
        ok: false,
        errorCode: "AUDIO_ONLY_SOURCE",
        message: "This job uses an audio-only source. Video export is not available.",
      },
    }
  }

  const runDir = path.join(os.tmpdir(), "movie-tra", "runs", jobId)
  if (!job.sourceName) {
    return {
      status: 400,
      body: {
        ok: false,
        errorCode: "SOURCE_NAME_MISSING",
        message: "Original source name is missing for this job.",
      },
    }
  }

  const sourcePath = path.join(runDir, job.sourceName)
  if (!fs.existsSync(sourcePath)) {
    return {
      status: 404,
      body: {
        ok: false,
        errorCode: "SOURCE_NOT_FOUND",
        message: "Original video source was not found for this job.",
      },
    }
  }

  const root = process.cwd()
  const ffmpegPath = await resolveBinary(root, ["ffmpeg.exe", "ffmpeg"], [{ name: "ffmpeg", args: ["-version"] }])
  if (!ffmpegPath) {
    return {
      status: 500,
      body: {
        ok: false,
        errorCode: "FFMPEG_NOT_FOUND",
        message: "ffmpeg was not found for video export.",
      },
    }
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
    setJob(jobId, {
      ...job,
      remixArtifacts: mergeRemixArtifacts(
        job.remixArtifacts,
        {
          mode,
          finalVideoPath: exportReady ? finalVideoPath : undefined,
          exportReady,
          warnings: [...(job.remixArtifacts?.warnings || []), ...modeWarnings],
        },
        Array.isArray(job.segments) ? job.segments.length : 0
      ),
    })

    if (!exportReady) {
      return {
        status: 500,
        body: {
          ok: false,
          errorCode: "VIDEO_EXPORT_OUTPUT_MISSING",
          message: "Final video export finished but no final video file was created.",
        },
      }
    }

    return {
      status: 200,
      body: {
        ok: true,
        jobId,
        mode,
        finalVideoPath,
        exportReady,
        warnings: [...(job.remixArtifacts?.warnings || []), ...modeWarnings],
      },
    }
  } catch (error) {
    return {
      status: 500,
      body: {
        ok: false,
        errorCode: "VIDEO_EXPORT_ERROR",
        message: error instanceof Error ? error.message : "Final video export failed.",
      },
    }
  }
}

export async function runRemixViaWorker(
  request: RemixRequest
): Promise<WorkerRouteResult<RemixResponseBody>> {
  if (getWorkerBaseUrl()) {
    return callWorker<RemixRequest, RemixResponseBody>("/render/remix", request)
  }

  return runRemixLocal(request)
}

export async function runVideoExportViaWorker(
  request: VideoExportRequest
): Promise<WorkerRouteResult<VideoExportResponseBody>> {
  if (getWorkerBaseUrl()) {
    return callWorker<VideoExportRequest, VideoExportResponseBody>("/render/video-export", request)
  }

  return runVideoExportLocal(request)
}
