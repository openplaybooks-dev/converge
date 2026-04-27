# video-generate backends

Each subdirectory is a self-contained backend implementing the `video-generate` contract.

## Switching backends

Write the backend name to `ACTIVE`:

```bash
echo kling > ACTIVE
```

## Adding a new backend

1. `mkdir backends/my-backend`
2. Create `backends/my-backend/generate.js`:
   ```js
   export async function generate(input) {
     // input: { first_frame_image, prompt, duration_s, aspect_ratio, seed, fps, output_path }
     // return: { video_path, actual_duration_s, seed, model, cost_usd }
   }
   ```
3. Create `backends/my-backend/README.md` documenting:
   - Required environment variables (e.g. `KLING_API_KEY`)
   - Supported aspect ratios (list)
   - Supported duration range (e.g. 5-10s)
   - Whether the model honors seeds reliably
   - Known limitations (e.g. "transparent backgrounds not supported — generate on solid color and chroma-key")
4. Write `backends/ACTIVE` with the backend name.

## Shipped backends

### stub (default)

Writes a 1KB placeholder .mp4 that passes file-existence checks. Use for:
- End-to-end pipeline testing without API costs
- CI / smoke tests
- Development

Does NOT render real video. Switch before running a real production.

### kling (skeleton)

Skeleton for Kling 2.5 img2vid. Best-in-class character preservation from a single reference frame. The shipped file documents the request shape and required env vars; wire in the actual HTTP client when you're ready to spend.

Requires:
- `KLING_API_KEY` env var (or `KLING_ACCESS_KEY` + `KLING_SECRET_KEY` for the JWT-auth flow)

## Suggested real backends

Add these yourself based on your API access:

| Backend     | Provider      | Strengths                                                    | Notes                                          |
| ----------- | ------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| kling-2.5   | Kuaishou      | Best character-reference feature, strong img2vid             | Requires Kling API access                      |
| veo-3       | Google        | Native audio, strong cinematic motion, 8s clips              | Requires Vertex AI or Google AI Studio access  |
| sora-2      | OpenAI        | High coherence, character consistency, up to 60s             | Requires Sora API access                       |
| runway-gen-4| Runway        | Act-One (character), strong style transfer                   | Requires Runway API key                        |

For character spritesheet generation, **kling-2.5** is the recommended starting point — its img2vid mode preserves the canonical reference's identity better than the alternatives.

## Input contract recap

```ts
{
  first_frame_image: string,    // path to PNG/JPEG — use as frame 0
  prompt: string,               // natural-language motion prompt
  duration_s: number,           // desired clip length
  aspect_ratio?: "16:9" | "21:9" | "9:16" | "1:1" | "3:4" | "4:3",
  seed?: number | "auto",
  fps?: 24 | 30,
  output_path?: string
}
```

## Output contract recap

```ts
{
  video_path: string,           // caller's responsibility where; you write the .mp4 and return path
  actual_duration_s: number,
  seed: number,
  model: string,
  cost_usd: number | null
}
```

Backends must write to `.converge/logs/video-generate.log` one JSON line per call:

```json
{"ts":"2026-04-21T10:23:41Z","backend":"kling","model":"kling-2.5","output_path":"assets/characters/forest-elf/videos/idle/idle.mp4","duration_s":5.0,"seed":8472619,"cost_usd":0.35,"ok":true}
```
