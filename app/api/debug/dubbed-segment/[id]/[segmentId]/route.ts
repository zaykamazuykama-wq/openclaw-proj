import fs from "fs"
import os from "os"
import path from "path"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  const { id, segmentId } = await params
  const outputDir = path.join(os.tmpdir(), "movie-tra", "runs", id, "dubbed-segments")

  if (!fs.existsSync(outputDir)) {
    return NextResponse.json({ ok: false, message: "Dubbed segment folder not found." }, { status: 404 })
  }

  const match = fs
    .readdirSync(outputDir)
    .find((name) => name.startsWith(`${segmentId}.`))

  if (!match) {
    return NextResponse.json({ ok: false, message: "Dubbed segment not found." }, { status: 404 })
  }

  const filePath = path.join(outputDir, match)
  const fileBuffer = fs.readFileSync(filePath)
  const extension = path.extname(match).toLowerCase()
  const contentType = extension === ".wav" ? "audio/wav" : extension === ".ogg" ? "audio/ogg" : "audio/mpeg"

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  })
}
