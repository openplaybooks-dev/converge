---
title: Author Landscape Preview Prompt
description: AI authors a landscape-specific image-edit prompt by customizing the root ART_BIBLE.md to this scene's first-window landmarks.
inputs:
  - "assets/ART_BIBLE.md"
  - "assets/visual-target.png"
  - "assets/scenes/{{scene_id}}/scene.assembly.json"
  - "assets/scenes/{{scene_id}}/layers/landscape.png"
outputs:
  - "assets/scenes/{{scene_id}}/samples/landscape/landscape.prompt.md"
---

# 04-preview-prompt — author landscape image-edit prompt

```bash
python scripts/author_landscape_prompt.py {{scene_id}}
```

`author_landscape_prompt.py`:
- Reads `assets/ART_BIBLE.md` (project-wide root visual grammar).
- Sends `assets/visual-target.png` to the author AI as a vision
  input — the AI sees the actual style master image.
- Reads the scene's token list from `scene.assembly.json`, scoped to
  the first 12x12 window with dynamic tokens excluded.
- Sends a meta-prompt to Gemini text-out asking it to *customize*
  the root art bible into a landscape-specific image-edit prompt
  that:
  - opens with a clear RESTYLE instruction (skeleton as draft, keep
    composition + palette, replace flat-vector rendering),
  - **translates the visual-target image into rich painterly
    language** (brushwork, finish, atmosphere, palette, edges,
    mood) so the paint step (which is text-only) carries that style
    description forward,
  - pulls only environment-relevant rules from ART_BIBLE.md,
  - names this scene's specific landmarks for spatial vocabulary,
  - spells out the +/-3% positional rule and the "no UI / no chars"
    negatives.
- Writes the result to `samples/landscape/landscape.prompt.md`. That
  file is the single binding instruction read by the next stage
  (`05-preview-paint`).

The script does NOT generate images. One text call per scene
(~1¢). Use `--dry-run` to inspect the meta-prompt without paying.
Use `--force` to re-author when `landscape.prompt.md` exists.

# Fitness checks

- `samples/landscape/landscape.prompt.md` exists and is non-empty.
- File mentions environment-relevant style rules (palette, line,
  atmospheric depth, negatives) — and does NOT mention character
  proportions or UI.
