# Task: 01-art-bible

# 01-art-bible — Art Bible & Concept Hero-Shot

The bible is the **structured visual contract** every downstream asset prompt inherits. Without it each asset is a one-shot interpretation of a string-level "art_style" preset, and assets drift visually. With it, generators have multiple anchor points (visual-target screenshot + ART_BIBLE.md text + concept hero-shot image) and outputs stay coherent.

Two sequential steps:

## 1. Derive ART_BIBLE.md

```bash
python3 scripts/generate_art_bible.py
```

Sends `idea.md` + `assets/visual-target.png` to Gemini text and asks for a strict markdown spec:
- Palette (5–8 dominant colors with #RRGGBB hex)
- Line / shading rules
- Character proportions
- Environment & form language
- Negatives (specific things to avoid)

Sampled hex values come **from the visual-target image** (no invented colors). The mandatory `#RRGGBB` format is enforced by the lint check below.

## 2. Generate concept hero-shot

```bash
python3 scripts/generate_concept_hero_shot.py
```

Renders one 16:9 mid-gameplay frame that demonstrates the bible. This image becomes the **secondary visual anchor** for every per-scene concept (primary anchor = visual-target.png). Saves to `assets/concept/hero-shot.png` + sidecar prompt/seed.

## Note on scale

Sizing across asset classes is locked **numerically** by the per-asset
`height_tiles` / `subject_height_tiles` fields in `scenes.json` and
`objects-shared.json`, plus a small inline scale block in each generator's
prompt that names the canonical hero height (~1.5 tiles). No image-based
scale ruler is generated — the model is told the numbers and asked to
match the supplied references at the declared tile heights.

## Outputs

- `assets/ART_BIBLE.md` — text spec, ~1–2 KB, fed into every per-asset prompt
- `assets/concept/hero-shot.png` — visual demo, 16:9 ~1024 wide
- Sidecar `.prompt.txt` + `.seed.txt` for each

## Cost

- Step 1: 1 text-out call (~5¢ proxy via budget gate)
- Step 2: 1 image-gen call (~5¢ Gemini)

Total: ~10¢.