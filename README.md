# Mongolian Media Translator

Minimal patch version of the existing Next.js app with an upload-first workflow.

## Local run on Windows

1. Install Python 3.
2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Ensure `ffmpeg.exe` is available:
- keep `ffmpeg.exe` in the project root, or
- add `ffmpeg` to your PATH

4. Optional for URL mode:
- keep `yt-dlp.exe` in the project root, or
- install `yt-dlp` on PATH

5. Install Node dependencies:

```bash
npm install
```

6. Start development:

```bash
npm run dev
```

## Notes

- Upload File is the primary and most reliable path.
- URL mode is secondary and may fail for protected/sign-in-required links.
- The frontend should send uploads as `form.append("file", file)`.

## Optional environment variables

- `MAX_UPLOAD_MB`
- `WHISPER_MODEL_SIZE`
