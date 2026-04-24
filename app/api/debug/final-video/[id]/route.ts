import fs from "fs"
import { NextResponse } from "next/server"
import { getJob } from "@/lib/job-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const job = getJob(id)

  if (!job?.remixArtifacts?.finalVideoPath || !fs.existsSync(job.remixArtifacts.finalVideoPath)) {
    return NextResponse.json({ ok: false, message: "Final video not found." }, { status: 404 })
  }

  const fileBuffer = fs.readFileSync(job.remixArtifacts.finalVideoPath)
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store",
    },
  })
}
