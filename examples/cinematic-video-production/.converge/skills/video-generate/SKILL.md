---
name: video-generate
description: Generate a single video clip from a first-frame image + prompt. Adapter-only — the user configures a backend (Veo 3, Sora 2, Kling 2.5, Runway Gen-4, etc.) under backends/.
---

# video-generate

**This skill is an adapter, not an implementation.** It defines a stable contract the playbook depends on. The actual video-generation call lives in `backends/<backend>/generate.js` — the user picks the backend.

This split exists because:
- The playbook workflow is model-independent; decide the model once, swap freely.
- Frontier video models change monthly; freezing the caller contract insulates the playbook.
- You can stub the backend and run the whole pipeline end-to-end before spending a cent.

## Contract

### Inputs

```ts
{
  first_frame_image: string,    // path to the locked start keyframe
  last_frame_image?: string,    // optional — path to the locked end keyframe. Backends that support bookend interpolation (Kling, Runway Gen-4, Sora 2) should honor this; others fall back to first-frame-only with a warning.
  prompt: string,               // full prompt from build-shot-prompt.js --target video
  duration_s: number,           // requested clip duration
  aspect_ratio?: "16:9" | "21:9" | "9:16" | "1:1",
  seed?: number | "auto",
  fps?: 24 | 30                 // default 24
}
```

### Outputs

```ts
{
  video_path: string,           // .mp4, H.264, yuv420p
  actual_duration_s: number,    // what the model actually produced (may != requested)
  seed: number,
  model: string,                // e.g. "veo-3", "sora-2", "kling-2.5"
  cost_usd: number | null
}
```

## Procedure

1. Read `.converge/skills/video-generate/backends/ACTIVE` — a single-line text file naming the active backend (e.g. `veo-3`).
2. If `ACTIVE` does not exist, exit with:
   ```
   ERROR: no video-generate backend configured.
   Create .converge/skills/video-generate/backends/ACTIVE with a backend name.
   Available backends: <list subdirectories of backends/>
   Or use 'stub' for end-to-end testing with placeholder files.
   ```
3. Load `backends/<active>/generate.js` and call its `export async function generate(input)` with the contract input.
4. Validate the returned output matches the contract. Forward as-is.
5. Log to `.converge/logs/video-generate.log` (one JSON line per call).

## Available backends

Each subdirectory under `backends/` is a self-contained backend:

```
backends/
├── ACTIVE                 # single-line file — names the active backend
├── README.md              # how to add your own backend
├── stub/
│   └── generate.js        # shipped — writes a 1KB placeholder .mp4 for workflow testing
├── veo-3/                 # optional — google veo 3 via Vertex AI or genmedia api
├── sora-2/                # optional — openai sora 2 api
├── kling-2.5/             # optional — kling 2.5 api
└── runway-gen-4/          # optional — runway gen-4 api
```

Only `stub/` is shipped by default. See `backends/README.md` to add a real backend.

## Stub behavior (default)

The stub writes a 1KB valid-header .mp4 placeholder so the whole pipeline runs and every file check passes. It does NOT render real video. Switch to a real backend for production.

## Consistency contract

Every backend MUST:
- Honor `first_frame_image` as the actual frame 0 of the output (or its closest equivalent — "image as input" mode).
- If the model supports bookend interpolation AND `last_frame_image` is provided, honor it as the target end frame.
- If the model does NOT support bookend interpolation, ignore `last_frame_image`, emit a warning to `.converge/logs/video-generate.log`, and render first-frame-only. Do NOT fail.
- Honor `duration_s` within ±0.5s.
- Return a seed that, when reused, produces the same output. If the backend's model does not expose seeds, return a stable request hash.
- Record cost to `.converge/logs/video-generate.log`.

Backends that cannot honor these contracts must be documented in their README with explicit warnings.
