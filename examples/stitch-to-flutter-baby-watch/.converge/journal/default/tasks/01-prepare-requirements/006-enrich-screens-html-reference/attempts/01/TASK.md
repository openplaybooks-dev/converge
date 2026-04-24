# Task: 01-prepare-requirements/006-enrich-screens-html-reference

# Enrich screens.json with HTML Reference Paths

Read `.stitch/references/ANALYSIS.md` and **update** `.stitch/screens.json` so each screen object includes an `htmlReference` field.

## Inputs

- `.stitch/references/ANALYSIS.md` — Synthesized reference analysis (screen inventory lists `code.html` paths)
- `.stitch/screens.json` — Screen definitions from the UX breakdown (JSON array of screen objects)

## Field: `htmlReference`

- **Type:** string
- **Value:** Repo-relative path to the reference HTML file under `.stitch/references/`, e.g. `.stitch/references/babyguard_home_phase_2_alert/code.html`
- **If no suitable reference exists, or the file is missing on disk:** use an empty string `""`

Example entry after enrichment:

```json
{
  "id": "home",
  "title": "Home",
  "route": "/",
  "description": "...",
  "features": ["..."],
  "priority": 1,
  "htmlReference": ".stitch/references/babyguard_home_phase_2_alert/code.html"
}
```

## Task

1. **Read `.stitch/references/ANALYSIS.md`**
   - Focus on **## Screen Inventory** (and any other sections that list `.stitch/references/**/code.html` paths).
   - Build a mental list of available HTML paths, directory names, and how each reference was described (purpose, layout, state variant).

2. **Read `.stitch/screens.json`**
   - Confirm it is a **JSON array** of screen objects (same shape as produced by `004-breakdown-ux-to-screens`).

3. **For each object in the array**, add or overwrite `htmlReference`:
   - Match the UX screen to the **best** inventory row using `id`, `title`, `description`, `route`, and the inventory’s purpose/type columns — not every app screen will have a Stitch HTML twin.
   - Set `htmlReference` to the chosen repo-relative `code.html` path **only if** that file exists at the workspace root (`test -f` or equivalent). Otherwise set `""`.
   - Overlays and purely app-native screens often have no reference HTML; `""` is correct.

4. **Write back** `.stitch/screens.json` with valid JSON (stable key order optional; do not drop existing fields).

## Graceful Degradation

- If **## Screen Inventory** is empty or states there are no references, set `htmlReference` to `""` for every screen.
- If `.stitch/references/ANALYSIS.md` is minimal (no references), same as above.

## Success Criteria

- `.stitch/screens.json` remains valid JSON
- Every element in the top-level array includes `htmlReference` as a **string** (path or `""`)
- Any non-empty `htmlReference` points to a file that exists under `.stitch/references/`