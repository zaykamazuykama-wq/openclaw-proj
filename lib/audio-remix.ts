import fs from "fs"
import path from "path"

export type DubbedSegmentAudioInput = {
  segmentId: string
  start: number
  audioPath: string
}

export type DubbedMixResult = {
  mixedAudioPath?: string
  exportReady: boolean
  usedBackground: boolean
  fallbackUsed: boolean
  segmentsMixed: number
  warnings: string[]
}

function buildDubbedDialogueFilter(dubbedSegments: DubbedSegmentAudioInput[]) {
  const filterParts: string[] = []
  const delayedLabels: string[] = []

  dubbedSegments.forEach((segment, index) => {
    const delayMs = Math.max(0, Math.round(segment.start * 1000))
    filterParts.push(
      `[${index}:a]aresample=16000,aformat=sample_fmts=fltp:channel_layouts=mono,adelay=${delayMs}|${delayMs}[d${index}]`
    )
    delayedLabels.push(`[d${index}]`)
  })

  if (delayedLabels.length === 1) {
    filterParts.push(`${delayedLabels[0]}anull[dubbed]`)
  } else {
    filterParts.push(`${delayedLabels.join("")}amix=inputs=${delayedLabels.length}:normalize=0[dubbed]`)
  }

  return filterParts
}

export async function mixDubbedSegmentsForKeepBackground({
  ffmpegPath,
  runCommand,
  outputDir,
  dubbedSegments,
  backgroundStemPath,
}: {
  ffmpegPath: string
  runCommand: (file: string, args: string[], cwd?: string, timeout?: number) => Promise<unknown>
  outputDir: string
  dubbedSegments: DubbedSegmentAudioInput[]
  backgroundStemPath?: string
}): Promise<DubbedMixResult> {
  if (dubbedSegments.length === 0) {
    return {
      mixedAudioPath: undefined,
      exportReady: false,
      usedBackground: false,
      fallbackUsed: true,
      segmentsMixed: 0,
      warnings: ["No persisted dubbed segment audio files are available for mixing."],
    }
  }

  fs.mkdirSync(outputDir, { recursive: true })
  const mixedAudioPath = path.join(outputDir, "mixed-audio.wav")
  const inputs = dubbedSegments.flatMap((segment) => ["-i", segment.audioPath])
  const filterParts: string[] = []
  const delayedLabels: string[] = []

  dubbedSegments.forEach((segment, index) => {
    const delayMs = Math.max(0, Math.round(segment.start * 1000))
    filterParts.push(
      `[${index}:a]aresample=16000,aformat=sample_fmts=fltp:channel_layouts=mono,adelay=${delayMs}|${delayMs}[d${index}]`
    )
    delayedLabels.push(`[d${index}]`)
  })

  if (delayedLabels.length === 1) {
    filterParts.push(`${delayedLabels[0]}anull[dubbed]`)
  } else {
    filterParts.push(`${delayedLabels.join("")}amix=inputs=${delayedLabels.length}:normalize=0[dubbed]`)
  }

  let usedBackground = false
  let fallbackUsed = false
  const warnings: string[] = []
  const args = ["-y", ...inputs]
  const backgroundIndex = dubbedSegments.length

  if (backgroundStemPath && fs.existsSync(backgroundStemPath)) {
    usedBackground = true
    args.push("-i", backgroundStemPath)
    filterParts.push(`[${backgroundIndex}:a]aresample=16000,aformat=sample_fmts=fltp:channel_layouts=mono[bg]`)
    filterParts.push(`[dubbed][bg]amix=inputs=2:normalize=0[mixout]`)
  } else {
    fallbackUsed = true
    warnings.push("Background stem is unavailable. Mixed output was created from dubbed dialogue only.")
  }

  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    usedBackground ? "[mixout]" : "[dubbed]",
    "-ac",
    "1",
    "-ar",
    "16000",
    mixedAudioPath
  )

  await runCommand(ffmpegPath, args)

  return {
    mixedAudioPath: fs.existsSync(mixedAudioPath) ? mixedAudioPath : undefined,
    exportReady: fs.existsSync(mixedAudioPath),
    usedBackground,
    fallbackUsed,
    segmentsMixed: dubbedSegments.length,
    warnings,
  }
}

export async function mixDubbedSegmentsForReplaceMusic({
  ffmpegPath,
  runCommand,
  outputDir,
  dubbedSegments,
  replacementMusicPath,
  ambienceStemPath,
}: {
  ffmpegPath: string
  runCommand: (file: string, args: string[], cwd?: string, timeout?: number) => Promise<unknown>
  outputDir: string
  dubbedSegments: DubbedSegmentAudioInput[]
  replacementMusicPath: string
  ambienceStemPath?: string
}): Promise<DubbedMixResult> {
  if (dubbedSegments.length === 0) {
    return {
      mixedAudioPath: undefined,
      exportReady: false,
      usedBackground: false,
      fallbackUsed: true,
      segmentsMixed: 0,
      warnings: ["No persisted dubbed segment audio files are available for mixing."],
    }
  }

  if (!fs.existsSync(replacementMusicPath)) {
    return {
      mixedAudioPath: undefined,
      exportReady: false,
      usedBackground: false,
      fallbackUsed: true,
      segmentsMixed: dubbedSegments.length,
      warnings: ["Replacement music asset is unavailable. Replace-music mixing was not run."],
    }
  }

  fs.mkdirSync(outputDir, { recursive: true })
  const mixedAudioPath = path.join(outputDir, "mixed-audio.wav")
  const inputs = dubbedSegments.flatMap((segment) => ["-i", segment.audioPath])
  const filterParts = buildDubbedDialogueFilter(dubbedSegments)
  const args = ["-y", ...inputs, "-i", replacementMusicPath]
  const musicIndex = dubbedSegments.length
  let fallbackUsed = false
  const warnings: string[] = []

  filterParts.push(`[${musicIndex}:a]aresample=16000,aformat=sample_fmts=fltp:channel_layouts=mono,volume=0.8[music]`)

  let outputLabel = "[mixout]"
  if (ambienceStemPath && fs.existsSync(ambienceStemPath)) {
    args.push("-i", ambienceStemPath)
    const ambienceIndex = dubbedSegments.length + 1
    filterParts.push(`[${ambienceIndex}:a]aresample=16000,aformat=sample_fmts=fltp:channel_layouts=mono,volume=0.5[amb]`)
    filterParts.push(`[dubbed][music][amb]amix=inputs=3:normalize=0[mixout]`)
  } else {
    fallbackUsed = true
    warnings.push("Ambience stem is unavailable. Replace-music output was created from dubbed dialogue and replacement music only.")
    filterParts.push(`[dubbed][music]amix=inputs=2:normalize=0[mixout]`)
  }

  args.push(
    "-filter_complex",
    filterParts.join(";"),
    "-map",
    outputLabel,
    "-ac",
    "1",
    "-ar",
    "16000",
    mixedAudioPath
  )

  await runCommand(ffmpegPath, args)

  return {
    mixedAudioPath: fs.existsSync(mixedAudioPath) ? mixedAudioPath : undefined,
    exportReady: fs.existsSync(mixedAudioPath),
    usedBackground: false,
    fallbackUsed,
    segmentsMixed: dubbedSegments.length,
    warnings,
  }
}
