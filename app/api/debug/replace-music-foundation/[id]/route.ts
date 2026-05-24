import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"
import { getJob, setJob } from "@/lib/job-store"
import { mergeRemixArtifacts } from "@/lib/remix-artifacts"

const SUPPORTED_REPLACEMENT_MUSIC_EXTENSIONS = new Set([".mp3", ".wav", ".m4a"])

function resolveExistingReplacementMusic(runDir: string) {
  const replacementDir = path.join(runDir, "replacement-music")
  if (!fs.existsSync(replacementDir)) {
    return undefined
  }

  const fileName = fs.readdirSync(replacementDir).find((name) => !name.startsWith("."))
  return fileName ? path.join(replacementDir, fileName) : undefined
}

function buildReplacementMusicResponse(jobId: string, job: ReturnType<typeof getJob>, replacementMusicPath: string) {
  if (!job) {
    return NextResponse.json({ ok: false, errorCode: "NOT_FOUND", message: "Job not found." }, { status: 404 })
  }

  const nextRemixArtifacts = mergeRemixArtifacts(
    job.remixArtifacts,
    {
      mode: "replace_music",
      replacementMusicPath,
      exportReady: false,
      warnings: [
        ...((job.remixArtifacts?.warnings || []).filter(
          (warning) => warning !== "Replacement music is not attached yet. Remix contract is prepared but final music swap is not export-ready."
        )),
        "Replace-music foundation is prepared. Final replace-music mixing is not implemented yet.",
      ],
    },
    Array.isArray(job.segments) ? job.segments.length : 0
  )

  setJob(jobId, {
    ...job,
    remixArtifacts: nextRemixArtifacts,
  })

  return NextResponse.json({
    ok: true,
    jobId,
    mode: nextRemixArtifacts.mode,
    replacementMusicPath,
    mixedAudioPath: nextRemixArtifacts.mixedAudioPath,
    dubbedSegmentAudioPaths: nextRemixArtifacts.dubbedSegmentAudioPaths,
    backgroundStemPath: job.audioArtifacts?.backgroundStemPath,
    ambienceStemPath: job.audioArtifacts?.ambienceStemPath,
    exportReady: nextRemixArtifacts.exportReady,
    message: "Replacement music foundation prepared.",
  })
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

  const runDir = path.join(os.tmpdir(), "movie-tra", "runs", id)
  const replacementDir = path.join(runDir, "replacement-music")
  const { searchParams } = new URL(request.url)
  const requestedMusicPath = searchParams.get("musicPath")?.trim()

  let replacementMusicPath = resolveExistingReplacementMusic(runDir) || job.remixArtifacts?.replacementMusicPath

  if (requestedMusicPath) {
    if (!fs.existsSync(requestedMusicPath)) {
      return NextResponse.json(
        { ok: false, errorCode: "MUSIC_NOT_FOUND", message: "Replacement music source file was not found." },
        { status: 404 }
      )
    }

    fs.mkdirSync(replacementDir, { recursive: true })
    const copiedPath = path.join(replacementDir, path.basename(requestedMusicPath))
    fs.copyFileSync(requestedMusicPath, copiedPath)
    replacementMusicPath = copiedPath
  }

  if (!replacementMusicPath) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "NO_REPLACEMENT_MUSIC",
        message: "No replacement music asset is attached for this job yet.",
      },
      { status: 400 }
    )
  }

  return buildReplacementMusicResponse(id, job, replacementMusicPath)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return NextResponse.json({ ok: false, errorCode: "NOT_FOUND", message: "Job not found." }, { status: 404 })
  }

  const formData = await request.formData()
  const uploadedFile = formData.get("file")
  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    return NextResponse.json(
      { ok: false, errorCode: "NO_FILE", message: "No replacement music file was uploaded." },
      { status: 400 }
    )
  }

  const extension = path.extname(uploadedFile.name || "").toLowerCase()
  if (!SUPPORTED_REPLACEMENT_MUSIC_EXTENSIONS.has(extension)) {
    return NextResponse.json(
      { ok: false, errorCode: "UNSUPPORTED_FILE", message: "Supported replacement music formats: mp3, wav, m4a." },
      { status: 400 }
    )
  }

  const runDir = path.join(os.tmpdir(), "movie-tra", "runs", id)
  const replacementDir = path.join(runDir, "replacement-music")
  fs.mkdirSync(replacementDir, { recursive: true })

  const safeName = path.basename(uploadedFile.name || `replacement${extension}`)
  const storedPath = path.join(replacementDir, safeName)
  const buffer = Buffer.from(await uploadedFile.arrayBuffer())
  fs.writeFileSync(storedPath, buffer)

  return buildReplacementMusicResponse(id, job, storedPath)
}
