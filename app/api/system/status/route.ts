import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { execFile } from "child_process"

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) return p
  }
  return null
}

function run(file: string, args: string[]) {
  return new Promise<boolean>((resolve) => {
    execFile(file, args, { windowsHide: true }, (error) => {
      resolve(!error)
    })
  })
}

async function hasPython() {
  const candidates: Array<[string, string[]]> = [
    ["py", ["-3", "--version"]],
    ["py", ["--version"]],
    ["python", ["--version"]],
    ["python3", ["--version"]],
  ]

  for (const [file, args] of candidates) {
    if (await run(file, args)) return true
  }

  return false
}

export async function GET() {
  const root = process.cwd()
  const elevenLabsApiKeyConfigured = Boolean(process.env.ELEVENLABS_API_KEY?.trim())
  const elevenLabsVoiceMappingCount = Object.keys(process.env).filter(
    (key) => key.startsWith("ELEVENLABS_VOICE_ID_") && Boolean(process.env[key]?.trim())
  ).length

  const ytDlpPath = firstExisting([
    path.join(root, "yt-dlp.exe"),
    path.join(root, "..", "yt-dlp.exe"),
    path.join(root, "yt-dlp"),
    path.join(root, "..", "yt-dlp"),
  ])

  const ffmpegPath = firstExisting([
    path.join(root, "ffmpeg.exe"),
    path.join(root, "..", "ffmpeg.exe"),
    path.join(root, "ffmpeg"),
    path.join(root, "..", "ffmpeg"),
  ])

  const scriptPath = firstExisting([
    path.join(root, "scripts", "transcribe_translate.py"),
    path.join(root, "..", "scripts", "transcribe_translate.py"),
  ])

  const pythonAvailable = await hasPython()

  return NextResponse.json({
    ytdlp: {
      available: !!ytDlpPath,
      message: ytDlpPath ? `Found: ${ytDlpPath}` : "yt-dlp not found",
    },
    ffmpeg: {
      available: !!ffmpegPath,
      message: ffmpegPath ? `Found: ${ffmpegPath}` : "ffmpeg not found",
    },
    elevenlabs: {
      configured: elevenLabsApiKeyConfigured,
      voiceMappingsConfigured: elevenLabsVoiceMappingCount > 0,
      voiceMappingCount: elevenLabsVoiceMappingCount,
      message: elevenLabsApiKeyConfigured
        ? elevenLabsVoiceMappingCount > 0
          ? "ElevenLabs API key and voice mappings are configured"
          : "ElevenLabs API key is configured, but no voice mappings were found"
        : "ElevenLabs API key is not configured",
    },
    python: {
      available: pythonAvailable,
      message: pythonAvailable ? "Python found" : "Python not found",
    },
    transcription: {
      available: !!scriptPath,
      message: scriptPath
        ? `Found script: ${scriptPath}`
        : "transcribe_translate.py not found",
    },
    translation: {
      available: !!scriptPath,
      message: scriptPath
        ? "Translation script is ready"
        : "Translation script not ready",
    },
  })
}
