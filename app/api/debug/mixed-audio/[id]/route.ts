import fs from "fs"
import { NextResponse } from "next/server"
import { getJob } from "@/lib/job-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job?.remixArtifacts?.mixedAudioPath || !fs.existsSync(job.remixArtifacts.mixedAudioPath)) {
    return NextResponse.json({ ok: false, message: "Mixed audio not found." }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(job.remixArtifacts.mixedAudioPath)
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  })
}
