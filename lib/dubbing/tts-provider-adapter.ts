import type { TtsProviderPayloadItem } from "@/lib/dubbing/build-tts-provider-payload"
import type { VoiceId } from "@/lib/voice-selector"

export type TtsProviderId = "elevenlabs" | "fishaudio" | "cartesia" | "openvoice" | "custom"

export type TtsProviderSynthesisResult = {
  provider: TtsProviderId
  segmentId: string
  status: "success" | "error" | "missing_api_key" | "missing_voice_mapping" | "not_implemented"
  audioBuffer?: ArrayBuffer
  contentType?: string
  errorMessage?: string
}

export interface TtsProviderAdapter {
  providerId: TtsProviderId
  synthesize(payload: TtsProviderPayloadItem[]): Promise<TtsProviderSynthesisResult[]>
}

class PlaceholderTtsProviderAdapter implements TtsProviderAdapter {
  providerId: TtsProviderId

  constructor(providerId: TtsProviderId) {
    this.providerId = providerId
  }

  async synthesize(payload: TtsProviderPayloadItem[]): Promise<TtsProviderSynthesisResult[]> {
    return payload.map((item) => ({
      provider: this.providerId,
      segmentId: item.segmentId,
      status: "not_implemented",
    }))
  }
}

function getElevenLabsApiKey() {
  return process.env.ELEVENLABS_API_KEY?.trim() || ""
}

function getElevenLabsBaseUrl() {
  return process.env.ELEVENLABS_BASE_URL?.trim() || "https://api.elevenlabs.io"
}

function getElevenLabsVoiceId(baseVoiceId?: VoiceId) {
  if (!baseVoiceId) return ""
  const envKey = `ELEVENLABS_VOICE_ID_${baseVoiceId}` as const
  return process.env[envKey]?.trim() || ""
}

function getShortErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || "Unknown synthesis error."
  }
  return "Unknown synthesis error."
}

function shortenProviderErrorText(text: string, maxLength = 300) {
  const trimmed = text.trim()
  if (!trimmed) return ""
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed
}

class ElevenLabsTtsProviderAdapter implements TtsProviderAdapter {
  providerId: TtsProviderId = "elevenlabs"

  async synthesize(payload: TtsProviderPayloadItem[]): Promise<TtsProviderSynthesisResult[]> {
    const apiKey = getElevenLabsApiKey()

    return Promise.all(
      payload.map(async (item) => {
        if (!apiKey) {
          return {
            provider: this.providerId,
            segmentId: item.segmentId,
            status: "missing_api_key" as const,
            errorMessage: "ELEVENLABS_API_KEY is not configured.",
          }
        }

        const voiceId = getElevenLabsVoiceId(item.voice.baseVoiceId)
        if (!voiceId) {
          return {
            provider: this.providerId,
            segmentId: item.segmentId,
            status: "missing_voice_mapping" as const,
            errorMessage: item.voice.baseVoiceId
              ? `No ElevenLabs voice mapping was found for ${item.voice.baseVoiceId}.`
              : "No baseVoiceId was provided for ElevenLabs voice resolution.",
          }
        }

        if (!item.text.trim()) {
          return {
            provider: this.providerId,
            segmentId: item.segmentId,
            status: "error" as const,
            errorMessage: "Empty text payload.",
          }
        }

        try {
          const response = await fetch(`${getElevenLabsBaseUrl()}/v1/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "xi-api-key": apiKey,
            },
            body: JSON.stringify({
              text: item.text,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            return {
              provider: this.providerId,
              segmentId: item.segmentId,
              status: "error" as const,
              errorMessage:
                shortenProviderErrorText(errorText) ||
                `ElevenLabs request failed with status ${response.status}.`,
            }
          }

          return {
            provider: this.providerId,
            segmentId: item.segmentId,
            status: "success" as const,
            audioBuffer: await response.arrayBuffer(),
            contentType: response.headers.get("content-type") || "audio/mpeg",
          }
        } catch (error) {
          return {
            provider: this.providerId,
            segmentId: item.segmentId,
            status: "error" as const,
            errorMessage: getShortErrorMessage(error),
          }
        }
      })
    )
  }
}

export function getTtsProviderAdapter(providerId: TtsProviderId): TtsProviderAdapter {
  if (providerId === "elevenlabs") {
    return new ElevenLabsTtsProviderAdapter()
  }
  return new PlaceholderTtsProviderAdapter(providerId)
}
