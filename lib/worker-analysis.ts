import { execFile } from "child_process"
import fs from "fs"
import path from "path"

export type AnalysisOutput = {
  detected_language?: string
  target_language?: string
  full_transcript?: string
  full_translation?: string
  segments: Array<{
    start: number
    end: number
    sourceText: string
    mongolianText: string
    speakerId?: string
  }>
  speaker_summary?: Array<{
    speakerId: string
    segmentCount: number
  }>
}

type CommandResult = {
  stdout: string
  stderr: string
}

type PythonCandidate = {
  file: string
  prefixArgs: string[]
}

type WorkerAnalysisResult = {
  parsed: AnalysisOutput
  execution: "worker" | "local"
}

type RunWorkerAnalysisOptions = {
  root: string
  inputPath: string
  outputPath: string
  targetLanguage: string
  whisperModel: string
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

function firstExisting(paths: string[]) {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

async function resolvePython(): Promise<PythonCandidate> {
  const candidates: PythonCandidate[] = [
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

function getWorkerBaseUrl() {
  return process.env.WORKER_BASE_URL?.trim() || ""
}

function asFiniteNumber(value: unknown, fieldName: string, index: number) {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`Worker analysis segment ${index + 1} has an invalid ${fieldName}.`)
  }
  return parsed
}

function asRequiredString(value: unknown, fieldName: string, index: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Worker analysis segment ${index + 1} is missing ${fieldName}.`)
  }
  return value
}

function normalizeWorkerOutput(parsed: unknown): AnalysisOutput {
  const safe = (parsed || {}) as Partial<AnalysisOutput>
  if (!Array.isArray(safe.segments) || safe.segments.length === 0) {
    throw new Error("The transcript is empty. Please try another media file.")
  }

  const segments = safe.segments.map((segment, index) => {
    const raw = (segment || {}) as Record<string, unknown>
    const start = asFiniteNumber(raw.start, "start", index)
    const end = asFiniteNumber(raw.end, "end", index)

    if (end < start) {
      throw new Error(`Worker analysis segment ${index + 1} has an end time before its start time.`)
    }

    return {
      start,
      end,
      sourceText: asRequiredString(raw.sourceText, "sourceText", index),
      mongolianText: asRequiredString(raw.mongolianText, "mongolianText", index),
      speakerId: typeof raw.speakerId === "string" && raw.speakerId.trim() ? raw.speakerId.trim() : undefined,
    }
  })

  const speakerSummary = Array.isArray(safe.speaker_summary)
    ? safe.speaker_summary
        .map((speaker) => {
          const raw = (speaker || {}) as Record<string, unknown>
          const speakerId = typeof raw.speakerId === "string" ? raw.speakerId.trim() : ""
          const segmentCount = Number(raw.segmentCount)
          if (!speakerId || !Number.isFinite(segmentCount)) return null
          return { speakerId, segmentCount }
        })
        .filter((speaker): speaker is { speakerId: string; segmentCount: number } => Boolean(speaker))
    : undefined

  return {
    detected_language: typeof safe.detected_language === "string" ? safe.detected_language : undefined,
    target_language: typeof safe.target_language === "string" ? safe.target_language : undefined,
    full_transcript: typeof safe.full_transcript === "string" ? safe.full_transcript : undefined,
    full_translation: typeof safe.full_translation === "string" ? safe.full_translation : undefined,
    segments,
    speaker_summary: speakerSummary,
  }
}

function writeAnalysisOutput(outputPath: string, parsed: AnalysisOutput) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), "utf-8")
}

async function runAnalysisOnWorker({
  inputPath,
  outputPath,
  targetLanguage,
  whisperModel,
}: Omit<RunWorkerAnalysisOptions, "root">): Promise<WorkerAnalysisResult> {
  const baseUrl = getWorkerBaseUrl()
  const secret = process.env.WORKER_SHARED_SECRET?.trim()
  const formData = new FormData()
  const audioBuffer = fs.readFileSync(inputPath)
  const audioBlob = new Blob([audioBuffer], { type: "audio/wav" })

  formData.append("file", audioBlob, path.basename(inputPath))
  formData.append("targetLanguage", targetLanguage)
  formData.append("whisperModel", whisperModel)

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/analysis/transcribe-translate`, {
    method: "POST",
    headers: {
      ...(secret ? { "X-Worker-Secret": secret } : {}),
    },
    body: formData,
  })

  let data: AnalysisOutput & { errorCode?: string; message?: string }
  try {
    data = (await response.json()) as AnalysisOutput & { errorCode?: string; message?: string }
  } catch {
    throw new Error("Worker analysis returned an invalid JSON response.")
  }
  if (!response.ok) {
    throw new Error(data.message || data.errorCode || "Worker analysis failed.")
  }

  const parsed = normalizeWorkerOutput(data)
  writeAnalysisOutput(outputPath, parsed)
  return {
    parsed,
    execution: "worker",
  }
}

async function runAnalysisLocally({
  root,
  inputPath,
  outputPath,
  targetLanguage,
  whisperModel,
}: RunWorkerAnalysisOptions): Promise<WorkerAnalysisResult> {
  const python = await resolvePython()
  const scriptPath = firstExisting([
    path.join(root, "scripts", "transcribe_translate.py"),
    path.join(root, "..", "scripts", "transcribe_translate.py"),
  ])

  if (!scriptPath) {
    throw new Error("scripts/transcribe_translate.py was not found.")
  }

  await runCommand(python.file, [
    ...python.prefixArgs,
    scriptPath,
    "--input",
    inputPath,
    "--output",
    outputPath,
    "--target-language",
    targetLanguage,
    "--whisper-model",
    whisperModel,
  ])

  if (!fs.existsSync(outputPath)) {
    throw new Error("Processing finished but result.json was not created.")
  }

  const parsed = normalizeWorkerOutput(JSON.parse(fs.readFileSync(outputPath, "utf-8")))
  return {
    parsed,
    execution: "local",
  }
}

export async function runAnalysisViaWorker(
  options: RunWorkerAnalysisOptions
): Promise<WorkerAnalysisResult> {
  if (getWorkerBaseUrl()) {
    return runAnalysisOnWorker(options)
  }

  return runAnalysisLocally(options)
}
