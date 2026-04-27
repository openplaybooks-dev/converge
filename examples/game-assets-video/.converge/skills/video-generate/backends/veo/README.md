# Veo 3 backend (Gemini API)

Calls Google's Veo 3 video model via the `google-genai` SDK using the same `GEMINI_API_KEY` the image-gen pipeline uses.

## Required env vars

- `GEMINI_API_KEY` — same key as image-gen
- `VEO_MODEL` *(optional)* — defaults to `veo-3.0-generate-001`

## Supported parameters

- **Aspect ratios**: `16:9`, `9:16` (we map `4:3`/`3:4` → `9:16` and everything else → `16:9`)
- **Duration**: 4–8 seconds; the dispatcher rounds the requested `duration_s` into that range
- **Seed**: forwarded if provided as an int; otherwise the model picks
- **First frame**: required, used as the literal frame zero (img2vid mode)
- **Person generation**: set to `allow_all` so character renders aren't blocked

## Cost

Roughly $0.40–$0.75 per 5–8s clip at the time of writing. Check the current Gemini API pricing page.

## Behavior

- Generates a single clip per call (`number_of_videos=1`)
- Polls the long-running operation every 10s, up to a 10-minute cap
- Downloads the resulting mp4 via `client.files.download()` and writes it to `output_path`
- Logs one JSON line to `.converge/logs/video-generate.log`

## Limitations

- Veo doesn't expose a way to lock the *last* frame; if you pass `last_frame_image`, the dispatcher ignores it (Veo would silently ignore it too)
- Veo doesn't produce transparent backgrounds — the prompt must request a solid chroma color (the default motion prompt asks for `#00FF00`) and `extract_video_frames.py` chroma-keys it downstream
- Audio generation is left at the SDK default; if Veo emits audio it's discarded once we extract frames
