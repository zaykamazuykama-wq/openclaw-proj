import { NextResponse } from "next/server"
import { listStudioProjects } from "@/lib/studio-store"

export async function GET() {
  return NextResponse.json({ projects: listStudioProjects() })
}
