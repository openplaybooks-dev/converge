---
name: video-generate
description: Generate a single video clip from a first-frame image + prompt. Adapter-only — the user configures a backend (Kling 2.5, Veo 3, Sora 2, Runway Gen-4, etc.) under backends/.
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
  first_frame_image: string,    // path to the locked start keyframe (canonical character ref)
  last_frame_image?: string,    // optional — path to the locked end keyframe. Backends that support bookend interpolation (Kling, Runway Gen-4, Sora 2) should honor this; others fall back to first-frame-only with a warning.
  prompt: string,               // natural-language motion narration
  negative_prompt?: string,     // optional — concrete failure modes to weight against (camera rotation, identity drift, accessory disappearance, etc.). Backends that don't support negative prompts should silently ignore.
  duration_s: number,           // requested clip duration
  aspect_ratio?: "16:9" | "21:9" | "9:16" | "1:1" | "3:4" | "4:3",
  seed?: number | "auto",
  fps?: 24 | 30,                // default 24
  output_path?: string          // where to write the .mp4
}
```

### Outputs

```ts
{
  video_path: string,           // .mp4, H.264, yuv420p
  actual_duration_s: number,    // what the model actually produced (may != requested)
  seed: number,
  model: string,                // e.g. "kling-2.5", "veo-3", "stub"
  cost_usd: number | null
}
```

## Procedure

1. Read `.converge/skills/video-generate/backends/ACTIVE` — a single-line text file naming the active backend (e.g. `kling`).
2. If `ACTIVE` does not exist, exit with:
   ```
   ERROR: no video-generate backend configured.
   Create .converge/skills/video-generate/backends/ACTIVE with a backend name.
   Available backends: <list subdirectories of backends/>
   Or use 'stub' for end-to-end testing with placeholder files.
   ```
3. Load `backends/<active>/generate.{js,py}` and invoke it. JS backends expose `export async function generate(input)` and are called via Node subprocess; Python backends read JSON from stdin and write JSON to stdout. Either form receives the contract input.
4. Validate the returned output matches the contract. Forward as-is.
5. Log to `.converge/logs/video-generate.log` (one JSON line per call).

## Available backends

```
backends/
├── ACTIVE                 # single-line file — names the active backend
├── README.md              # how to add your own backend
├── stub/
│   └── generate.js        # shipped — writes a 1KB placeholder .mp4 for workflow testing
├── veo/
│   └── generate.py        # shipped (live) — Google Veo via google-genai;
│                          # requires GEMINI_API_KEY; only veo-3.1-generate-preview
│                          # at 8s supports last_frame bookend
├── kling/
│   └── generate.js        # shipped (live) — Kuaishou Kling img2vid;
│                          # requires KLINGAI_ACCESS_KEY + KLINGAI_SECRET_KEY (JWT auth);
│                          # default model kling-v1-6, 5s/10s clips only
└── grok/
    └── generate.js        # shipped (live) — xAI grok-imagine-video;
                           # requires XAI_API_KEY (or GROK_API_KEY); 1-15s,
                           # 480p/720p, broad aspect-ratio support; no bookend
```

## Stub behavior (default)

The stub writes a 1KB valid-header .mp4 placeholder so the whole pipeline runs and every file check passes. It does NOT render real video. Switch to a real backend for production.

## Consistency contract

Every backend MUST:
- Honor `first_frame_image` as the actual frame 0 of the output (or its closest equivalent — "image as input" mode). For this example the first frame is always the character's canonical reference.
- Honor `duration_s` within ±0.5s.
- Return a seed that, when reused, produces the same output. If the backend's model does not expose seeds, return a stable request hash.
- Record cost to `.converge/logs/video-generate.log`.

Backends that cannot honor these contracts must be documented in their README with explicit warnings.
