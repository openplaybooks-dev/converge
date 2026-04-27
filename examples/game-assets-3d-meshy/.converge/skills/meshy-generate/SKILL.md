---
name: meshy-generate
description: Generate a single 3D asset (.glb) via Meshy AI. Supports text-to-3D and image-to-3D, two-stage preview/refine for cost control, with PBR textures on refine.
---

# meshy-generate

Adapter for the Meshy AI text-to-3D and image-to-3D APIs. Two-stage by design:

- **preview** — cheap (5cr lowpoly, 20cr standard), no PBR, good enough to validate prompt + silhouette.
- **refine** — adds PBR textures (10cr), takes a `preview_task_id` to avoid re-billing geometry.

The split exists because PBR textures dominate the cost and you only want to pay for them once you've reviewed the preview meshes.

## Contract

### Inputs

```ts
{
  mode: "preview" | "refine",
  asset_slug: string,
  output_path: string,          // where to write the .glb

  // For mode: "preview"
  prompt?: string,
  image_url?: string,           // for image-to-3D; mutually exclusive with prompt
  ai_model?: "meshy-6" | "meshy-5" | "latest",  // default meshy-6
  model_type?: "lowpoly" | "standard",          // default lowpoly
  topology?: "quad" | "triangle",               // default quad
  target_polycount?: number,                    // default 8000
  pose_mode?: "a-pose" | "t-pose" | "",         // default ""

  // For mode: "refine"
  preview_task_id?: string,     // required for refine
  enable_pbr?: boolean,         // default true on refine
  hd_texture?: boolean,         // default false (extra cost)
}
```

### Outputs

```ts
{
  output_path: string,          // path written
  task_id: string,              // Meshy task id (or "stub-..." for stub)
  model: string,                // "meshy-6" or "stub"
  cost_credits: number,
}
```

## Procedure

1. Read `backends/ACTIVE`. If absent, error with the available list.
2. Load `backends/<active>/generate.js` and call its `generate(input)`.
3. Validate the GLB exists and is non-empty.
4. Append a JSON line to `.converge/logs/meshy-generate.log` with the task metadata.

## Backends

- **meshy** — calls `POST /openapi/v2/text-to-3d` (or `/openapi/v1/image-to-3d`), polls until SUCCEEDED, downloads the GLB. Requires `MESHY_API_KEY` and Pro tier.
- **stub** — copies `vendor/stub-cube.glb` to `output_path`. Lets the pipeline run offline with zero credentials.

See `backends/README.md` for adding new backends (e.g. Tripo3D).
