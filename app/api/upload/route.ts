import { randomUUID } from "crypto"
import { execFile } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { createWriteStream } from "fs"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import { NextRequest, NextResponse } from "next/server"
import { setJob } from "@/lib/job-store"
import { prepareDubbingSegments } from "@/lib/dubbing/prepare-dubbing-segments"
import { prepareAudioArtifacts } from "@/lib/audio-artifacts"
import { prepareRemixArtifacts } from "@/lib/remix-artifacts"

const SUPPORTED_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".m4a"])
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || "500")
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024
const BLOCKED_LINK_MESSAGE =
  "This link is protected or requires sign-in. Please upload the media file directly."

type Stage = "upload" | "extract" | "transcribe" | "translate" | "done" | "error"

type CommandResult = {
  stdout: string
  stderr: string
}

function pushLog(logs: string[], message: string) {
  logs.push(message)
}

function progressForStage(stage: Stage): number {
  const progressMap: Record<Stage, number> = {
    upload: 15,
    extract: 35,
    transcribe: 65,
    translate: 90,
    done: 100,
    error: 0,
  }
  return progressMap[stage]
}

function errorResponse(logs: string[], message: string, stage: Stage = "error", status = 500) {
  const errorCodeMap: Record<Stage, string> = {
    upload: "UPLOAD_ERROR",
    extract: "FFMPEG_ERROR",
    transcribe: "TRANSCRIBE_ERROR",
    translate: "TRANSLATION_ERROR",
    done: "RUNTIME_ERROR",
    error: "RUNTIME_ERROR",
  }

  return NextResponse.json(
    {
      success: false,
      stage,
      progress: progressForStage(stage),
      logs: [...logs, `Error: ${message}`],
      errorCode: errorCodeMap[stage],
      message,
      error: message,
      detectedLanguage: "",
      fullTranscript: "",
      fullTranslation: "",
      segments: [],
      sourceName: "",
      sourceType: "",
      warnings: [],
    },
    { status }
  )
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

function firstExisting(paths: string[]) {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

async function commandExists(command: string, args: string[] = ["--version"]) {
  try {
    await runCommand(command, args)
    return true
  } catch {
    return false
  }
}

async function resolvePython() {
  const candidates = [
    { file: "py", prefixArgs: ["-3"] },
    { file: "py", prefixArgs: [] },
    { file: "python", prefixArgs: [] },
    { file: "python3", prefixArgs: [] },
  ]

  for (const candidate of candidates) {
    if (await commandExists(candidate.file, [...candidate.prefixArgs, "--version"])) {
      return candidate
    }
  }

  throw new Error("Python was not found. Install Python 3 and make sure `py`, `python`, or `python3` works.")
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

function hasOnlyIncompatibleWindowsBinary(root: string, localNames: string[]) {
  if (process.platform === "win32") return false
  const localCandidates = localNames.flatMap((name) => [path.join(root, name), path.join(root, "..", name)])
  for (const candidate of localCandidates) {
    if (!fs.existsSync(candidate)) continue
    if (path.extname(candidate).toLowerCase() === ".exe") {
      return true
    }
  }
  return false
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function getExtension(name: string) {
  return path.extname(name || "").toLowerCase()
}

function assertSupportedExtension(filename: string) {
  const extension = getExtension(filename)
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported format: ${extension || "unknown"}. Supported formats: mp4, mov, mkv, webm, mp3, wav, m4a.`
    )
  }
}

function blockedLinkError(message: string) {
  const clean = (message || "").trim()
  const blockedPatterns = [
    /sign in/i,
    /403/i,
    /429/i,
    /captcha/i,
    /private video/i,
    /video unavailable/i,
    /forbidden/i,
    /requested format is not available/i,
    /login required/i,
    /cookies/i,
    /bot/i,
  ]

  if (blockedPatterns.some((pattern) => pattern.test(clean))) {
    return `${BLOCKED_LINK_MESSAGE}\n\nTechnical details:\n${clean}`
  }

  return clean || "Failed to download the provided URL."
}

async function writeUploadedFile(file: File, destinationPath: string) {
  const nodeStream = Readable.fromWeb(file.stream() as globalThis.ReadableStream<Uint8Array>)
  await pipeline(nodeStream, createWriteStream(destinationPath))
}

async function downloadUrlToFile(
  ytDlpPath: string,
  ffmpegPath: string,
  url: string,
  runDir: string,
  logs: string[]
) {
  const template = path.join(runDir, "source.%(ext)s")

  pushLog(logs, `Downloading media from URL: ${url}`)
  try {
    await runCommand(
      ytDlpPath,
      [
        "--no-playlist",
        "--ffmpeg-location",
        path.dirname(ffmpegPath),
        "-o",
        template,
        url,
      ],
      runDir
    )
  } catch (error: any) {
    throw new Error(blockedLinkError(error?.message || "URL download failed"))
  }

  const downloaded = fs
    .readdirSync(runDir)
    .filter((name) => name.startsWith("source."))
    .map((name) => path.join(runDir, name))

  if (downloaded.length === 0) {
    throw new Error("Downloaded file not found after yt-dlp finished.")
  }

  const sourcePath = downloaded[0]
  assertSupportedExtension(sourcePath)
  return sourcePath
}

export async function POST(req: NextRequest) {
  const logs: string[] = []
  let stage: Stage = "upload"

  try {
    const root = process.cwd()
    const formData = await req.formData()
    const uploadedFile = formData.get("file")
    const url = String(formData.get("url") || "").trim()

    const hasFile = uploadedFile instanceof File && uploadedFile.size > 0
    const hasUrl = Boolean(url)

    if (!hasFile && !hasUrl) {
      return errorResponse(logs, "Please upload a media file or paste a URL.", "upload", 400)
    }

    if (hasFile && hasUrl) {
      return errorResponse(logs, "Use either Upload File or Paste URL, not both at the same time.", "upload", 400)
    }

    const jobId = randomUUID()
    const runDir = path.join(os.tmpdir(), "movie-tra", "runs", jobId)
    fs.mkdirSync(runDir, { recursive: true })
    pushLog(logs, `Run folder created: ${runDir}`)

    let sourcePath = ""
    let sourceName = ""
    let sourceType: "file" | "url" = "file"

    if (hasFile) {
      const file = uploadedFile as File
      sourceName = safeFileName(file.name || "upload.bin")
      sourceType = "file"
      assertSupportedExtension(sourceName)

      if (file.size > MAX_UPLOAD_BYTES) {
        return errorResponse(logs, `File is too large. Maximum allowed size is ${MAX_UPLOAD_MB} MB.`, "upload", 400)
      }

      pushLog(logs, `Saving uploaded file: ${sourceName}`)
      sourcePath = path.join(runDir, sourceName)
      await writeUploadedFile(file, sourcePath)
      pushLog(logs, `Upload saved successfully (${Math.round(file.size / 1024 / 1024)} MB).`)
    } else {
      sourceType = "url"
      sourceName = url
      const ytDlpPath = await resolveBinary(
        root,
        ["yt-dlp.exe", "yt-dlp"],
        [{ name: "yt-dlp", args: ["--version"] }]
      )
      if (!ytDlpPath) {
        const onlyWindowsBinary = hasOnlyIncompatibleWindowsBinary(root, ["yt-dlp.exe", "yt-dlp"])
        return errorResponse(
          logs,
          onlyWindowsBinary
            ? "URL import is unavailable on this server because only the Windows yt-dlp.exe binary is present. Please upload the media file directly."
            : "URL import is unavailable. Please upload the media file directly.",
          "upload",
          500
        )
      }
      const ffmpegForUrl = await resolveBinary(
        root,
        ["ffmpeg.exe", "ffmpeg"],
        [{ name: "ffmpeg", args: ["-version"] }]
      )
      if (!ffmpegForUrl) {
        return errorResponse(
          logs,
          "URL import is unavailable because ffmpeg is missing on this server. Please upload the media file directly.",
          "upload",
          500
        )
      }
      sourcePath = await downloadUrlToFile(ytDlpPath, ffmpegForUrl, url, runDir, logs)
      sourceName = path.basename(sourcePath)
      pushLog(logs, `URL download saved as: ${sourceName}`)
    }

    const ffmpegPath = await resolveBinary(
      root,
      ["ffmpeg.exe", "ffmpeg"],
      [{ name: "ffmpeg", args: ["-version"] }]
    )
    if (!ffmpegPath) {
      const onlyWindowsBinary = hasOnlyIncompatibleWindowsBinary(root, ["ffmpeg.exe", "ffmpeg"])
      return errorResponse(
        logs,
        onlyWindowsBinary
          ? "ffmpeg is unavailable on this server because only the Windows ffmpeg.exe binary is present. Install ffmpeg for this server or use a compatible environment."
          : "ffmpeg was not found. Install ffmpeg or place it on the server PATH.",
        "extract",
        500
      )
    }

    const python = await resolvePython()
    const scriptPath = firstExisting([
      path.join(root, "scripts", "transcribe_translate.py"),
      path.join(root, "..", "scripts", "transcribe_translate.py"),
    ])
    if (!scriptPath) {
      return errorResponse(logs, "scripts/transcribe_translate.py was not found.", "transcribe", 500)
    }

    stage = "extract"
    pushLog(logs, "Extracting mono 16k WAV audio with ffmpeg...")
    const wavPath = path.join(runDir, "audio.wav")
    const ffmpegResult = await runCommand(ffmpegPath, ["-y", "-i", sourcePath, "-vn", "-ac", "1", "-ar", "16000", wavPath])
    const ffmpegStderr = (ffmpegResult.stderr || "").trim()
    pushLog(logs, `ffmpeg stderr:\n${ffmpegStderr || "(empty)"}`)

    if (!fs.existsSync(wavPath)) {
      return errorResponse(logs, "Audio extraction failed because audio.wav was not created.", "extract", 500)
    }

    const audioArtifacts = await prepareAudioArtifacts({
      sourceMixPath: wavPath,
      runDir,
      ffmpegPath,
      runCommand,
    })
    audioArtifacts.warnings.forEach((warning) => pushLog(logs, warning))

    stage = "transcribe"
    pushLog(logs, `Transcribing with faster-whisper (${process.env.WHISPER_MODEL_SIZE || "tiny"})...`)
    const jsonPath = path.join(runDir, "result.json")
    await runCommand(python.file, [
      ...python.prefixArgs,
      scriptPath,
      "--input",
      audioArtifacts.transcriptionInputPath,
      "--output",
      jsonPath,
      "--target-language",
      "mn",
      "--whisper-model",
      process.env.WHISPER_MODEL_SIZE || "tiny",
    ])

    if (!fs.existsSync(jsonPath)) {
      return errorResponse(logs, "Processing finished but result.json was not created.", "transcribe", 500)
    }

    const parsed = JSON.parse(fs.readFileSync(jsonPath, "utf-8"))
    if (!Array.isArray(parsed?.segments) || parsed.segments.length === 0) {
      return errorResponse(logs, "The transcript is empty. Please try another media file.", "transcribe", 500)
    }

    stage = "translate"
    pushLog(logs, "Translation to Mongolian completed.")

    const dubbingSegments = prepareDubbingSegments(parsed.segments || [])
    const uniqueVoices = Array.from(new Set(dubbingSegments.map((segment) => segment.chosenVoiceName).filter(Boolean)))
    if (uniqueVoices.length > 0) {
      pushLog(logs, `Voice library match ready: ${uniqueVoices.join(", ")}`)
    }

    const selectedVoices = Array.from(
      new Map(
        dubbingSegments
          .filter((segment) => segment.chosenVoiceId && segment.chosenVoiceName)
          .map((segment) => [segment.chosenVoiceId, { id: segment.chosenVoiceId, displayName: segment.chosenVoiceName }])
      ).values()
    )
    const providersUsed = Array.from(
      new Set(dubbingSegments.map((segment) => segment.chosenVoiceProvider).filter(Boolean))
    )
    const fallbackUsed = dubbingSegments.some((segment) =>
      (segment.chosenVoiceReason || []).includes("Neutral Mongolian fallback")
    )
    const providerPreviewAvailable =
      Boolean(process.env.ELEVENLABS_API_KEY?.trim()) &&
      selectedVoices.some((voice) => Boolean(process.env[`ELEVENLABS_VOICE_ID_${voice.id}`]?.trim()))
    const voiceMatchSummary = {
      selectedVoices,
      providersUsed,
      fallbackUsed,
      candidateCount: dubbingSegments.reduce(
        (maxCount, segment) => Math.max(maxCount, segment.alternativeVoiceCandidates?.length || 0),
        0
      ),
      providerPreviewAvailable,
    }

    const remixArtifacts = prepareRemixArtifacts({
      mode: "keep_background",
      audioArtifacts,
      remixArtifacts,
      segments: dubbingSegments,
    })

    stage = "done"
    pushLog(logs, "Done.")

    const result = {
      success: true,
      jobId,
      stage,
      progress: progressForStage(stage),
      logs,
      sourceName,
      sourceType,
      detectedLanguage: parsed.detected_language || "",
      fullTranscript: parsed.full_transcript || "",
      fullTranslation: parsed.full_translation || "",
      segments: dubbingSegments,
      voiceMatchSummary,
      audioArtifacts,
      remixArtifacts,
      warnings: [],
      message: "Processing completed successfully.",
    }

    setJob(jobId, result)
    return NextResponse.json(result)
  } catch (error: any) {
    const message = error?.message || "Unknown runtime error."
    return errorResponse(logs, message, stage === "done" ? "error" : stage, 500)
  }
}
