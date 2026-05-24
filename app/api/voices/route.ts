import { NextResponse } from "next/server"
import { listStudioVoices } from "@/lib/studio-store"

export async function GET() {
  return NextResponse.json({ voices: listStudioVoices() })
}
