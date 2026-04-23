---
name: image-generate
description: Generate a single image via Nano-banana (Gemini 2.5 Flash Image). Supports up to 3 reference images for identity/location preservation. Returns image path + seed.
---

# image-generate

Thin adapter over Google's **Gemini 2.5 Flash Image** (aka "Nano-banana") via the Gemini API. Used for:

- Character turnaround / expression / wardrobe sheets
- Location wide plates + detail angles + time-of-day variants
- Palette swatches
- Storyboard thumbnails
- Per-shot keyframes (the highest-leverage use — reference-driven)

## Contract

### Inputs

```ts
{
  prompt: string,               // required
  references?: string[],        // 0-3 file paths. Supports PNG/JPEG/WebP.
  aspect_ratio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "21:9",
  seed?: number | "auto",       // "auto" lets the model pick; record the returned seed for reproducibility
  quality?: "draft" | "final"   // draft used for storyboards
}
```

### Outputs

```ts
{
  image_path: string,           // caller's caller writes the PNG; adapter returns bytes
  seed: number,                 // always return the seed actually used
  model: "gemini-2.5-flash-image",
  prompt_tokens: number,
  image_tokens: number,
  cost_usd: number | null
}
```

The caller is responsible for deciding where to save the image on disk — this skill just returns the bytes and metadata.

## Procedure

1. Validate inputs. Reject `references` > 3.
2. Load each reference as inline base64 with its MIME type.
3. Build a single Gemini content parts list: `[ref1, ref2, ref3, prompt]`.
4. Call `gemini-2.5-flash-image:generateContent` with:
   - `generation_config.response_mime_type = "image/png"`
   - `generation_config.aspect_ratio = <input>` (mapped)
   - `generation_config.seed = <input or omit>`
5. Extract the generated image + the model's returned seed.
6. Return the contract.

## When to use which reference count

| Refs | Use case                                                      |
| ---- | ------------------------------------------------------------- |
| 0    | First generation of a turnaround or wide plate                |
| 1    | Expression sheet (turnaround as ref) / time variant (wide)    |
| 2    | Keyframe with one character (char wardrobe + location plate)  |
| 3    | Keyframe with two characters (char1 + char2 + location plate) |

If a shot needs more than two characters in frame simultaneously, pick the two with the most face-visible coverage and inline additional character descriptions as text.

## Environment

Set `GEMINI_API_KEY` in the converge runtime environment. Without it, the adapter exits with a clear error directing the user to set the key.

## Cost discipline

- Use `quality: "draft"` for every call in 06-storyboard. Storyboards exist to be glanced at and cheap.
- Use `quality: "final"` only for reference sheets (02-cast, 03-world), palette, and keyframes (07-keyframes).
- Log every call's cost to `.converge/logs/image-generate.log` (one JSON line per call) so 10-assemble/003-report can sum it up.
