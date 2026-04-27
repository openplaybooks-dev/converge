---
name: meshy-rig
description: Auto-rig a humanoid GLB via Meshy AI. Returns a rigged GLB + rig_task_id needed by meshy-animate.
---

# meshy-rig

Adapter for `POST /openapi/v1/rigging`. Humanoid-only. Output is a rigged GLB plus a `rig_task_id` you pass to `meshy-animate` to apply animation library clips.

## Constraints (enforced by Meshy)

- Mesh must be ≤ 300k faces.
- Front of the mesh must point along +Z.
- Humanoid topology only (head + torso + 2 arms + 2 legs).

The playbook only invokes this skill on assets with `kind: hero | npc | enemy` AND `humanoid: true`.

## Contract

### Inputs

```ts
{
  asset_slug: string,
  input_glb: string,            // path to the GLB to rig (or a Meshy task_id via input_task_id)
  output_path: string,          // where to write the rigged GLB
  height_meters?: number,       // default 1.7
}
```

### Outputs

```ts
{
  output_path: string,
  rig_task_id: string,          // pass to meshy-animate
  cost_credits: number,
}
```

## Backends

- **meshy** — uploads `input_glb` to Meshy and runs the rig task.
- **stub** — copies the input GLB to output_path and returns `rig_task_id: "stub-rig-<slug>"`.
