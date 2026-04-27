---
name: meshy-animate
description: Apply a Meshy animation library clip (by action_id) to a rigged humanoid. Outputs an animated GLB.
---

# meshy-animate

Adapter for `POST /openapi/v1/animations`. Takes a `rig_task_id` (from `meshy-rig`) and an `action_id` from Meshy's animation library (500+ presets — locomotion, idle, combat, interactions, etc.). Outputs an animated GLB containing the skinned mesh + the named clip.

## Animation library

The `action_id` is an integer keyed to Meshy's animation library. The playbook ships a small subset relevant to game MVPs as `assets/anim-library.json` (curated from https://docs.meshy.ai/en/api/animation-library):

```json
{
  "Idle":   { "action_id": 1001 },
  "Walk":   { "action_id": 2001 },
  "Run":    { "action_id": 2010 },
  "Jump":   { "action_id": 3001 },
  "PickUp": { "action_id": 4012 },
  "Attack": { "action_id": 5001 },
  "Death":  { "action_id": 5099 }
}
```

Note: action_id values above are illustrative — the real ids are documented in Meshy's library reference. The stub backend ignores them.

## Contract

```ts
// Inputs
{
  asset_slug: string,
  rig_task_id: string,
  action_name: string,          // e.g. "Idle", "Walk"
  action_id: number,            // Meshy library id
  output_path: string,          // where to write <clip>.glb
  fps?: 24 | 30 | 60,
}

// Outputs
{
  output_path: string,
  action_name: string,
  task_id: string,
  cost_credits: number,
}
```

## Backends

- **meshy** — real animation generation, 3 credits per clip.
- **stub** — copies the rigged GLB to output_path; downstream play.html falls back to procedural animation.
