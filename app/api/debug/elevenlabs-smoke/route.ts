import { NextResponse } from "next/server"
import { prepareDubbingSegments } from "@/lib/dubbing/prepare-dubbing-segments"
import { buildTtsProviderPayload } from "@/lib/dubbing/build-tts-provider-payload"
import { getTtsProviderAdapter } from "@/lib/dubbing/tts-provider-adapter"
import { getBaseVoiceById, type VoiceId } from "@/lib/voice-selector"
import type { TranscriptSegment } from "@/lib/types"

const SAMPLE_TEXT = "Сайн байна уу. Энэ бол туршилтын дуу."
const ALLOWED_SMOKE_VOICE_IDS: VoiceId[] = ["F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"]

function getMappedSmokeTestVoiceId(requestedVoiceId?: string | null): VoiceId | null {
  if (requestedVoiceId && ALLOWED_SMOKE_VOICE_IDS.includes(requestedVoiceId as VoiceId)) {
    const castVoiceId = requestedVoiceId as VoiceId
    if (process.env[`ELEVENLABS_VOICE_ID_${castVoiceId}`]?.trim()) {
      return castVoiceId
    }
  }

  if (process.env.ELEVENLABS_VOICE_ID_F3?.trim()) return "F3"
  if (process.env.ELEVENLABS_VOICE_ID_M3?.trim()) return "M3"
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const requestedVoiceId = searchParams.get("baseVoiceId")
  const baseVoiceId = getMappedSmokeTestVoiceId(requestedVoiceId)

  if (!baseVoiceId) {
    return NextResponse.json({
      ok: false,
      provider: "elevenlabs",
      baseVoiceIdTested: null,
      status: "missing_voice_mapping",
      errorMessage: requestedVoiceId
        ? `No ElevenLabs voice mapping was found for ${requestedVoiceId}.`
        : "No ElevenLabs voice mapping was found for F3 or M3.",
    })
  }

  const baseVoice = getBaseVoiceById(baseVoiceId)
  const transcriptSegments: TranscriptSegment[] = [
    {
      start: 0,
      end: 2.4,
      sourceText: SAMPLE_TEXT,
      mongolianText: SAMPLE_TEXT,
      voiceSelection: {
        baseVoiceId,
        timbre: baseVoice.baseTimbre,
        energy: baseVoice.baseEnergy,
        emotion: baseVoice.defaultEmotion,
      },
    },
  ]

  const dubbingSegments = prepareDubbingSegments(transcriptSegments)
  const payload = buildTtsProviderPayload(dubbingSegments)
  const adapter = getTtsProviderAdapter("elevenlabs")
  const [result] = await adapter.synthesize(payload)

  return NextResponse.json({
    ok: result.status === "success",
    provider: "elevenlabs",
    baseVoiceIdTested: baseVoiceId,
    status: result.status,
    contentType: result.contentType,
    byteLength: result.audioBuffer?.byteLength,
    errorMessage: result.errorMessage,
  })
}
