---
title: Asset Breakdown
description: Generate comprehensive breakdown of all assets to be generated
dependencies:
  - "01-setup-art-style"
outputs:
  - ".converge/asset-breakdown.json"
checks:
  - id: breakdown-exists
    cmd: test -s .converge/asset-breakdown.json
    description: Asset breakdown generated
tags:
  - breakdown
  - planning
---

# Asset Breakdown

Generate a comprehensive breakdown of all assets that will be generated across all asset types.

## Task

Run the asset breakdown script to analyze all asset definitions:

```bash
python3 scripts/generate_asset_breakdown.py
```

## Output

Generates `.converge/asset-breakdown.json` containing:

**Summary:**
- Total characters
- Total angle references
- Total pose variations
- Total sprite sheets
- Total frames
- Estimated generation time

**Per-Character Details:**
- Spec document path
- 4 angle references (front, side_left, side_right, back)
- 3 pose variations (attack, defend, jump)
- N sprite sheets with frame counts
- Atlas JSON paths

## Example Output

```json
{
  "summary": {
    "total_characters": 3,
    "total_angle_refs": 12,
    "total_pose_refs": 9,
    "total_sprite_sheets": 6,
    "total_frames": 24,
    "estimated_time_minutes": 19
  },
  "characters": [
    {
      "id": "hero-knight",
      "name": "Sir Aldric",
      "outputs": {
        "spec": "assets/characters/hero-knight/SPEC.md",
        "angles": ["front.png", "side_left.png", "side_right.png", "back.png"],
        "poses": ["attack.png", "defend.png", "jump.png"],
        "states": {
          "idle": {
            "frames": 4,
            "sheet": "assets/characters/hero-knight/states/idle/idle.png",
            "atlas": "assets/characters/hero-knight/states/idle/atlas.json"
          }
        }
      },
      "counts": {
        "angle_refs": 4,
        "pose_refs": 3,
        "sprite_sheets": 2,
        "total_frames": 8
      }
    }
  ]
}
```

## Verification

- Breakdown file exists at `.converge/asset-breakdown.json`
- Summary contains accurate counts
- All characters from sprites.json are included
- Output paths are correct

## Usage

Review the breakdown to understand:
- What assets will be generated
- How many tasks will be spawned
- Estimated time for generation
- Complete inventory of outputs
