---
name: image-generate
description: Generate a single image via Nano-banana (Gemini 2.5 Flash Image). Supports up to 3 reference images for identity/location preservation. Returns image bytes + seed.
---

# image-generate

Thin adapter over Google's Gemini 2.5 Flash Image via the Gemini API. Used for:
- Character reference sheets
- Object sprites
- Background reference images
- Animation sprite sheets

## Contract

### Inputs
```ts
{
  prompt: string,
  references?: string[],    // 0-3 file paths (PNG/JPEG/WebP)
  aspect_ratio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16",
  seed?: number | "auto",
  quality?: "draft" | "final"
}
```

### Outputs
```ts
{
  image_bytes: Uint8Array,
  seed: number,
  model: "gemini-2.5-flash-image"
}
```

## Procedure

1. Validate inputs (max 3 references)
2. Load each reference as inline base64 with MIME type
3. Build Gemini content parts list: `[ref1, ref2, ref3, prompt]`
4. Call `gemini-2.5-flash-image:generateContent`
5. Extract generated image + returned seed
6. Return contract

## Environment

- `GEMINI_API_KEY` — required when the active backend is `gemini`
- `OPENAI_API_KEY` — required when the active backend is `openai`
- `IMAGE_BACKEND` (optional) — overrides the `ACTIVE` file at runtime

## Backends

- `gemini/` — Gemini 2.5 Flash Image (nano-banana). Generates on a green background and chroma-keys it out.
- `openai/` — OpenAI `gpt-image-1`. Uses `background="transparent"` natively; reference images flow through `/v1/images/edits`. No chroma-key post-process.
- `stub/` — returns a 1x1 PNG placeholder, for testing without API costs.

Active backend selected via `.converge/skills/image-generate/backends/ACTIVE` (one line, e.g. `gemini` or `openai`), or overridden per-process by the `IMAGE_BACKEND` env var.
