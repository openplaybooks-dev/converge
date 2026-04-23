# video-generate backends

Each subdirectory is a self-contained backend implementing the `video-generate` contract.

## Switching backends

Write the backend name to `ACTIVE`:

```bash
echo veo-3 > ACTIVE
```

## Adding a new backend

1. `mkdir backends/my-backend`
2. Create `backends/my-backend/generate.js`:
   ```js
   export async function generate(input) {
     // input: { first_frame_image, prompt, duration_s, aspect_ratio, seed, fps }
     // return: { video_path, actual_duration_s, seed, model, cost_usd }
   }
   ```
3. Create `backends/my-backend/README.md` documenting:
   - Required environment variables (e.g. `VEO_API_KEY`)
   - Supported aspect ratios (list)
   - Supported duration range (e.g. 2-8s)
   - Whether the model honors seeds reliably
   - Known limitations (e.g. "aspect ratios other than 16:9 are upscaled")
4. Write `backends/ACTIVE` with the backend name.

## Shipped backends

### stub (default)

Writes a 1KB placeholder .mp4 that passes file-existence checks. Use for:
- End-to-end pipeline testing without API costs
- CI / smoke tests
- Development

Does NOT render real video. Switch before running a real production.

## Suggested real backends

Not shipped — add these yourself based on your API access:

| Backend     | Provider      | Strengths                                                    | Notes                                          |
| ----------- | ------------- | ------------------------------------------------------------ | ---------------------------------------------- |
| veo-3       | Google        | Native audio, strong cinematic motion, 8s clips              | Requires Vertex AI or Google AI Studio access  |
| sora-2      | OpenAI        | High coherence, character consistency, up to 60s             | Requires Sora API access                       |
| kling-2.5   | Kuaishou      | Best character-reference feature, strong img2vid             | Requires Kling API access                      |
| runway-gen-4| Runway        | Act-One (character), strong style transfer                   | Requires Runway API key                        |

When in doubt, start with **veo-3** for cinematic narrative and **kling-2.5** for character-heavy scenes.

## Input contract recap

```ts
{
  first_frame_image: string,    // path to PNG/JPEG — use as frame 0
  prompt: string,               // natural-language motion prompt
  duration_s: number,           // desired clip length
  aspect_ratio?: "16:9" | "21:9" | "9:16" | "1:1",
  seed?: number | "auto",
  fps?: 24 | 30
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
{"ts":"2026-04-21T10:23:41Z","shot_id":"sh-0042","model":"veo-3","duration_s":6.0,"seed":8472619,"cost_usd":0.75,"ok":true}
```
