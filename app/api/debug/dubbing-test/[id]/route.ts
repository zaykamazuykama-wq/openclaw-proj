import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"
import { getJob, setJob } from "@/lib/job-store"
import { prepareDubbingSegments } from "@/lib/dubbing/prepare-dubbing-segments"
import { buildTtsProviderPayload } from "@/lib/dubbing/build-tts-provider-payload"
import { getTtsProviderAdapter } from "@/lib/dubbing/tts-provider-adapter"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "NOT_FOUND",
        message: "Job not found.",
      },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(request.url)
  const parsedLimit = Number(searchParams.get("limit") || "3")
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(3, Math.floor(parsedLimit))) : 3
  const baseSegments = Array.isArray(job.segments) ? job.segments.slice(0, limit) : []

  if (baseSegments.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "NO_SEGMENTS",
        message: "No prepared dubbing segments are available for this job.",
      },
      { status: 400 }
    )
  }

  const dubbingSegments = prepareDubbingSegments(baseSegments)
  const payload = buildTtsProviderPayload(dubbingSegments)
  const adapter = getTtsProviderAdapter("elevenlabs")
  const results = await adapter.synthesize(payload)
  const outputDir = path.join(os.tmpdir(), "movie-tra", "runs", id, "dubbed-segments")
  fs.mkdirSync(outputDir, { recursive: true })

  const generatedFiles = results.flatMap((result) => {
    if (result.status !== "success" || !result.audioBuffer) {
      return []
    }

    const contentType = result.contentType || "audio/mpeg"
    const extension = contentType.includes("wav") ? "wav" : contentType.includes("ogg") ? "ogg" : "mp3"
    const filePath = path.join(outputDir, `${result.segmentId}.${extension}`)
    fs.writeFileSync(filePath, Buffer.from(result.audioBuffer))

    return [{
      segmentId: result.segmentId,
      audioPath: filePath,
      previewUrl: `/api/debug/dubbed-segment/${id}/${result.segmentId}`,
      contentType,
      byteLength: result.audioBuffer.byteLength,
    }]
  })

  if (job.remixArtifacts) {
    setJob(id, {
      ...job,
      remixArtifacts: {
        ...job.remixArtifacts,
        dubbedSegmentAudioPaths: generatedFiles.map((file) => file.previewUrl),
      },
    })
  }

  return NextResponse.json({
    ok: results.some((result) => result.status === "success"),
    jobId: id,
    segmentsAttempted: payload.length,
    providerUsed: "elevenlabs",
    selectedVoices: Array.from(
      new Map(
        dubbingSegments
          .filter((segment) => segment.chosenVoiceId && segment.chosenVoiceName)
          .map((segment) => [segment.chosenVoiceId, { id: segment.chosenVoiceId, displayName: segment.chosenVoiceName }])
      ).values()
    ),
    generatedFiles,
    previewUrls: generatedFiles.map((file) => file.previewUrl),
    segmentResults: results.map((result, index) => ({
      segmentId: payload[index]?.segmentId || result.segmentId,
      status: result.status,
      audioPath: generatedFiles.find((file) => file.segmentId === result.segmentId)?.audioPath,
      previewUrl: generatedFiles.find((file) => file.segmentId === result.segmentId)?.previewUrl,
      contentType: result.contentType,
      byteLength: result.audioBuffer?.byteLength,
      errorMessage: result.errorMessage,
    })),
  })
}
