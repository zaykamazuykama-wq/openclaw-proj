import { NextResponse } from "next/server"
import { updateStudioCharacter } from "@/lib/studio-store"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; characterId: string }> }
) {
  const { id, characterId } = await params

  let body: { name?: string; voice_id?: string | null }
  try {
    body = (await request.json()) as { name?: string; voice_id?: string | null }
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    )
  }

  if (body.name !== undefined && !body.name.trim()) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_NAME", message: "Character name cannot be empty." },
      { status: 400 }
    )
  }

  const bundle = updateStudioCharacter(id, characterId, {
    name: body.name,
    voice_id: body.voice_id ?? undefined,
  })

  if (!bundle) {
    return NextResponse.json(
      { ok: false, errorCode: "NOT_FOUND", message: "Character not found." },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, bundle })
}
