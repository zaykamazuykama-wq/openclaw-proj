import fs from "fs"
import os from "os"
import path from "path"
import type { ProcessingResult } from "@/lib/types"

const jobs = new Map<string, ProcessingResult>()

function getJobResultPath(id: string) {
  return path.join(os.tmpdir(), "movie-tra", "runs", id, "job-result.json")
}

export function getJob(id: string) {
  const inMemory = jobs.get(id)
  if (inMemory) {
    return inMemory
  }

  const filePath = getJobResultPath(id)
  if (!fs.existsSync(filePath)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ProcessingResult
    jobs.set(id, parsed)
    return parsed
  } catch {
    return undefined
  }
}

export function setJob(id: string, result: ProcessingResult) {
  jobs.set(id, result)

  const filePath = getJobResultPath(id)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf-8")
}
