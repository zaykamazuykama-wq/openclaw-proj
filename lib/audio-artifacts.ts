import fs from "fs"
import path from "path"

export type SeparationMode = "none" | "dialogue_background" | "dialogue_music_background" | "full_stems"

export type AudioArtifacts = {
  sourceMixPath: string
  transcriptionInputPath: string
  dialogueStemPath?: string
  backgroundStemPath?: string
  musicStemPath?: string
  ambienceStemPath?: string
  separationApplied: boolean
  separationMode: SeparationMode
  availableStems: string[]
  fallbackUsed: boolean
  warnings: string[]
}

export type AudioArtifactPreparationOptions = {
  sourceMixPath: string
  runDir: string
  ffmpegPath: string
  runCommand: (file: string, args: string[], cwd?: string, timeout?: number) => Promise<unknown>
}

function createFallbackArtifacts(sourceMixPath: string, warnings: string[] = []): AudioArtifacts {
  return {
    sourceMixPath,
    transcriptionInputPath: sourceMixPath,
    dialogueStemPath: sourceMixPath,
    backgroundStemPath: undefined,
    musicStemPath: undefined,
    ambienceStemPath: undefined,
    separationApplied: false,
    separationMode: "none",
    availableStems: ["mix", "dialogue"],
    fallbackUsed: true,
    warnings:
      warnings.length > 0
        ? warnings
        : ["Speech/background separation is not configured yet. Using the extracted mix as the dialogue input."],
  }
}

export async function prepareAudioArtifacts({
  sourceMixPath,
  runDir,
  ffmpegPath,
  runCommand,
}: AudioArtifactPreparationOptions): Promise<AudioArtifacts> {
  const dialogueStemPath = path.join(runDir, "dialogue.wav")
  const backgroundStemPath = path.join(runDir, "background.wav")
  const warnings: string[] = []

  try {
    await runCommand(ffmpegPath, [
      "-y",
      "-i",
      sourceMixPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-af",
      "highpass=f=120,lowpass=f=3800,afftdn=nf=-25",
      dialogueStemPath,
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dialogue separation error."
    return createFallbackArtifacts(sourceMixPath, [
      `Speech/background separation fallback: could not create dialogue stem. ${message}`,
    ])
  }

  try {
    await runCommand(ffmpegPath, [
      "-y",
      "-i",
      sourceMixPath,
      "-filter_complex",
      "[0:a]asplit=2[base][voice];[voice]highpass=f=120,lowpass=f=3800,afftdn=nf=-25[dialogue];[base][dialogue]amix=inputs=2:weights=1 -1:normalize=0,volume=2[background]",
      "-map",
      "[background]",
      "-ac",
      "1",
      "-ar",
      "16000",
      backgroundStemPath,
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown background separation error."
    warnings.push(`Background stem was not created. Using dialogue-only separation. ${message}`)
  }

  const hasDialogueStem = fs.existsSync(dialogueStemPath)
  const hasBackgroundStem = fs.existsSync(backgroundStemPath)

  if (!hasDialogueStem) {
    return createFallbackArtifacts(sourceMixPath, [
      "Speech/background separation fallback: dialogue stem file was not created. Using the extracted mix as the dialogue input.",
    ])
  }

  return {
    sourceMixPath,
    transcriptionInputPath: dialogueStemPath,
    dialogueStemPath,
    backgroundStemPath: hasBackgroundStem ? backgroundStemPath : undefined,
    musicStemPath: undefined,
    ambienceStemPath: undefined,
    separationApplied: true,
    separationMode: hasBackgroundStem ? "dialogue_background" : "none",
    availableStems: ["mix", "dialogue", ...(hasBackgroundStem ? ["background"] : [])],
    fallbackUsed: !hasBackgroundStem,
    warnings,
  }
}
