# Mongolian Media Translator

Minimal patch version of the existing Next.js app with an upload-first workflow for transcript review, translation, voice matching, and early remix/export testing.

## Local setup

### Install dependencies

1. Install Node.js and npm.
2. Install Python 3.
3. Install Node dependencies:

```bash
npm install
```

4. Install Python dependencies:

```bash
pip install -r requirements.txt
```

### Run locally

Start the development server:

```bash
npm run dev
```

Create a production build locally:

```bash
npm run build
```

## Required and optional tools

### `ffmpeg`

Required for:
- upload processing
- audio extraction
- audio separation fallback flow
- remix
- final export

Supported setup:
- keep `ffmpeg.exe` in the project root on Windows, or
- install `ffmpeg` on your system `PATH`

### `yt-dlp`

Optional. Required only for Paste URL / URL import mode.

Supported setup:
- keep `yt-dlp.exe` in the project root on Windows, or
- install `yt-dlp` on your system `PATH`

If `yt-dlp` is missing, direct file upload still works.

### ElevenLabs environment variables

Optional. Used for provider-backed dubbing / voice preview readiness.

Supported variables:
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_BASE_URL` (optional override)
- `ELEVENLABS_VOICE_ID_<VOICE_ID>`

Examples:
- `ELEVENLABS_VOICE_ID_F3`
- `ELEVENLABS_VOICE_ID_M3`

The app should not expose secret values. The UI only reports whether ElevenLabs configuration is present and whether any voice mappings are configured.

### Other environment variables

- `MAX_UPLOAD_MB`
- `WHISPER_MODEL_SIZE`

## Local setup readiness panel

The home page now includes a read-only Local setup readiness panel backed by `GET /api/system/status`.

It checks:
- whether `ffmpeg` is available
- whether `yt-dlp` is available
- whether an ElevenLabs API key is configured
- whether any ElevenLabs voice mappings are configured

It also shows compact warnings when required or helpful local setup is missing:
- missing `ffmpeg` blocks media processing
- missing `yt-dlp` limits URL import
- missing ElevenLabs config limits provider-backed voice preview/generation readiness

## Current MVP feature status

### Upload and process

Implemented:
- direct file upload
- optional URL import
- audio extraction
- transcription
- Mongolian translation
- progress/status reporting

### Audio separation

Implemented:
- separation artifact tracking in the processing result
- dialogue/background-oriented fallback handling
- read-only audio separation summary in the UI

Current state:
- separation data is surfaced as part of the processing response and downstream remix preparation

### Voice matching

Implemented:
- dubbing segment preparation
- voice selection / matching summary
- selected provider and fallback visibility
- preview-readiness reporting for configured providers

### Remix and export

Implemented:
- remix preparation artifacts
- keep-background remix path
- mixed audio generation
- final video export path

Current state:
- some remix/export actions still run through internal debug routes

### Replacement music

Implemented:
- replacement music upload
- replacement music attach-by-path flow
- replace-music remix preparation and execution

### Restore and reopen

Implemented:
- restore by `jobId`
- recent jobs list
- reopen link generation
- restore from `?jobId=...`

## Known limitations

- Some export and remix actions still use debug/internal routes rather than finalized public production routes.
- Results and intermediate artifacts are stored in local temporary storage, which is not durable deployment storage.
- Large binary tools such as `ffmpeg.exe`, `ffprobe.exe`, and `yt-dlp.exe` still need deliberate repo/setup handling for local development and cross-platform workflows.
- URL mode is secondary and may fail for protected, rate-limited, or sign-in-required sources.
- The current implementation is optimized for local MVP development rather than hardened multi-environment deployment.

## Notes

- Upload File is the primary and most reliable path.
- Paste URL is secondary and depends on `yt-dlp` plus a working `ffmpeg` runtime.
- The frontend should send uploads as `form.append("file", file)`.
