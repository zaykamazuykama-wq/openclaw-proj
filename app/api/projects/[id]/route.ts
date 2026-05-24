import { NextResponse } from "next/server"
import { getStudioProjectBundle, updateStudioProject } from "@/lib/studio-store"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const bundle = getStudioProjectBundle(id)

  if (!bundle) {
    return NextResponse.json(
      { ok: false, errorCode: "NOT_FOUND", message: "Project not found." },
      { status: 404 }
    )
  }

  return NextResponse.json(bundle)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { title?: string }
  try {
    body = (await request.json()) as { title?: string }
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_JSON", message: "Invalid request body." },
      { status: 400 }
    )
  }

  if (body.title !== undefined && !body.title.trim()) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_TITLE", message: "Project title cannot be empty." },
      { status: 400 }
    )
  }

  const bundle = updateStudioProject(id, { title: body.title })

  if (!bundle) {
    return NextResponse.json(
      { ok: false, errorCode: "NOT_FOUND", message: "Project not found." },
      { status: 404 }
    )
  }

  return NextResponse.json({ ok: true, bundle })
}
