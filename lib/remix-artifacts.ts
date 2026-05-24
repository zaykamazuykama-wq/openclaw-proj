import type { AudioArtifacts } from "@/lib/audio-artifacts"
import type { TranscriptSegment } from "@/lib/types"

export type RemixMode = "keep_background" | "replace_music" | "voice_plus_ambience"

export type RemixArtifacts = {
  mode: RemixMode
  sourceMixPath?: string
  dialogueStemPath?: string
  backgroundStemPath?: string
  musicStemPath?: string
  ambienceStemPath?: string
  dubbedSegmentAudioPaths: string[]
  mixedAudioPath?: string
  replacementMusicPath?: string
  finalVideoPath?: string
  exportReady: boolean
  fallbackUsed: boolean
  warnings: string[]
  selectedVoices: Array<{
    id: string
    displayName: string
  }>
  segmentCount: number
}

export function normalizeRemixMode(mode?: string | null): RemixMode {
  if (mode === "replace_music" || mode === "voice_plus_ambience") return mode
  return "keep_background"
}

export function mergeRemixArtifacts(
  current: RemixArtifacts | undefined,
  patch: Partial<RemixArtifacts> & { mode?: RemixMode },
  segmentCount = current?.segmentCount || 0
): RemixArtifacts {
  const mode = patch.mode || current?.mode || "keep_background"
  return {
    mode,
    sourceMixPath: patch.sourceMixPath ?? current?.sourceMixPath,
    dialogueStemPath: patch.dialogueStemPath ?? current?.dialogueStemPath,
    backgroundStemPath: patch.backgroundStemPath ?? current?.backgroundStemPath,
    musicStemPath: patch.musicStemPath ?? current?.musicStemPath,
    ambienceStemPath: patch.ambienceStemPath ?? current?.ambienceStemPath,
    dubbedSegmentAudioPaths: patch.dubbedSegmentAudioPaths ?? current?.dubbedSegmentAudioPaths ?? [],
    mixedAudioPath: patch.mixedAudioPath ?? current?.mixedAudioPath,
    replacementMusicPath: patch.replacementMusicPath ?? current?.replacementMusicPath,
    finalVideoPath: patch.finalVideoPath ?? current?.finalVideoPath,
    exportReady: patch.exportReady ?? current?.exportReady ?? false,
    fallbackUsed: patch.fallbackUsed ?? current?.fallbackUsed ?? false,
    warnings: patch.warnings ?? current?.warnings ?? [],
    selectedVoices: patch.selectedVoices ?? current?.selectedVoices ?? [],
    segmentCount: patch.segmentCount ?? current?.segmentCount ?? segmentCount,
  }
}

export function prepareRemixArtifacts({
  mode,
  audioArtifacts,
  segments,
}: {
  mode?: RemixMode
  audioArtifacts?: AudioArtifacts
  segments?: TranscriptSegment[]
}): RemixArtifacts {
  const safeMode = normalizeRemixMode(mode)
  const safeSegments = Array.isArray(segments) ? segments : []
  const selectedVoices = Array.from(
    new Map(
      safeSegments
        .filter((segment) => segment.chosenVoiceId && segment.chosenVoiceName)
        .map((segment) => [segment.chosenVoiceId, { id: segment.chosenVoiceId as string, displayName: segment.chosenVoiceName as string }])
    ).values()
  )

  const warnings: string[] = []
  if (!audioArtifacts?.backgroundStemPath && safeMode === "keep_background") {
    warnings.push("Background stem is not available yet. Final keep-background remix is not export-ready.")
  }
  if (safeMode === "replace_music") {
    warnings.push("Replacement music is not attached yet. Remix contract is prepared but final music swap is not export-ready.")
  }
  if (safeMode === "voice_plus_ambience" && !audioArtifacts?.ambienceStemPath) {
    warnings.push("Ambience/effects stem is not available yet. Voice-plus-ambience remix is not export-ready.")
  }

  return {
    mode: safeMode,
    sourceMixPath: audioArtifacts?.sourceMixPath,
    dialogueStemPath: audioArtifacts?.dialogueStemPath,
    backgroundStemPath: audioArtifacts?.backgroundStemPath,
    musicStemPath: audioArtifacts?.musicStemPath,
    ambienceStemPath: audioArtifacts?.ambienceStemPath,
    dubbedSegmentAudioPaths: [],
    mixedAudioPath: undefined,
    replacementMusicPath: undefined,
    finalVideoPath: undefined,
    exportReady: false,
    fallbackUsed: Boolean(audioArtifacts?.fallbackUsed),
    warnings,
    selectedVoices,
    segmentCount: safeSegments.length,
  }
}
