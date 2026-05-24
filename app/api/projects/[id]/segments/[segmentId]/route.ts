import { NextResponse } from "next/server"
import { updateStudioSegment } from "@/lib/studio-store"

type SegmentPatchBody = {
  spoken_mn?: string
  emotion?: string | null
  intensity?: number | null
  power?: number | null
  speed?: number | null
  pitch?: number | null
  speech_act?: string | null
  pause_style?: "none" | "breath" | "dramatic" | "hesitation" | null
}

function invalidNumber(value: number | null | undefined) {
  return value !== undefined && value !== null && !Number.isFinite(value)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; segmentId: string }> }
) {
  const { id, segmentId } = await params

  let body: SegmentPatchBody
  try {
    body = (await request.json()) as SegmentPatchBody
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    )
  }

  if (body.spoken_mn !== undefined && !body.spoken_mn.trim()) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_SPOKEN_MN", message: "Spoken Mongolian cannot be empty." },
      { status: 400 }
    )
  }

  if (invalidNumber(body.intensity) || (body.intensity !== null && body.intensity !== undefined && (body.intensity < 0 || body.intensity > 100))) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_INTENSITY", message: "Intensity must be between 0 and 100." },
      { status: 400 }
    )
  }

  if (invalidNumber(body.power) || (body.power !== null && body.power !== undefined && (body.power < 0 || body.power > 100))) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_POWER", message: "Power must be between 0 and 100." },
      { status: 400 }
    )
  }

  if (invalidNumber(body.speed) || (body.speed !== null && body.speed !== undefined && (body.speed < 0.5 || body.speed > 1.5))) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_SPEED", message: "Speed must be between 0.5 and 1.5." },
      { status: 400 }
    )
  }

  if (invalidNumber(body.pitch) || (body.pitch !== null && body.pitch !== undefined && (body.pitch < -50 || body.pitch > 50))) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_PITCH", message: "Pitch must be between -50 and 50." },
      { status: 400 }
    )
  }

  if (
    body.pause_style !== undefined &&
    body.pause_style !== null &&
    !["none", "breath", "dramatic", "hesitation"].includes(body.pause_style)
  ) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_PAUSE_STYLE", message: "Pause style is not supported." },
      { status: 400 }
    )
  }

  const bundle = updateStudioSegment(id, segmentId, body)

  if (!bundle) {
    return NextResponse.json(
      { ok: false, errorCode: "NOT_FOUND", message: "Segment not found." },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, bundle })
}
