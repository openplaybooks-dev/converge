# Task: 03-build-screens/010-guardians/010-01-spec

# Spec: Co-Guardians

Generate the screen specification for **Co-Guardians** (`/guardians`).

## Inputs
- `.stitch/system/DESIGN.md` — Design system
- `.stitch/UX.md` — UX overview
- `.stitch/screens.json` — Screen definitions (includes `htmlReference` for this screen: `.stitch/references/ch_p_nh_n_l_i_m_i/code.html`)
- `.stitch/references/ANALYSIS.md` — Synthesized analysis of design references (if available)
- **Linked HTML reference** — Repo-relative path from `screens.json` → `htmlReference` for this screen (see below). When this path is **non-empty** and the file exists, it is mandatory input.

## Reference HTML (`htmlReference`)

Value from `.stitch/screens.json` for this screen: **`.stitch/references/ch_p_nh_n_l_i_m_i/code.html`**

- If **non-empty** and the file exists at that path: open and read that HTML. It is the **authoritative** Stitch/reference UI for this screen. The spec MUST describe the same screen as that file: **identical** section order, hierarchy, visible labels/copy (allow language normalization only if UX mandates another locale), controls, states implied by the markup, and layout intent. Map Tailwind or raw HTML structure into clear Flutter-oriented section descriptions. If `ANALYSIS.md` or `UX.md` disagrees with this file, **prefer the linked HTML** for layout and content fidelity.
- If **empty** or the file is missing: do **not** treat a single HTML file as authoritative; use `ANALYSIS.md` Screen Inventory and `UX.md` as before to infer the closest reference screens.

## Task

1. If there is **no** usable linked HTML (empty `htmlReference` or missing file) and `.stitch/references/ANALYSIS.md` exists, consult the Screen Inventory and Component Inventory to find reference screens that match this screen's purpose. Note matching references for use in the spec.

Read inputs and produce `.stitch/designs/guardians/SPEC.md` containing:

1. **Screen Title** — Co-Guardians
2. **Purpose** — What this screen does and why
3. **Route** — `/guardians`
4. **Widget Name** — `GuardiansScreen`
5. **Design Tokens** — Colors, typography, spacing from DESIGN.md
6. **Layout Rules** — Scaffold structure, app bar, body, bottom nav
7. **Sections** — Each visual section with:
   - Description of content
   - Widget type (ListView, GridView, Column, etc.)
   - Data requirements
   - Interactive elements
8. **Data** — Entities and fields displayed on this screen
9. **Motion** — Entry animations, transitions, hero animations
10. **Accessibility** — Semantics labels, focus order, contrast notes
11. **Anti-Patterns** — Things to avoid

## Success Criteria

- `.stitch/designs/guardians/SPEC.md` exists and has >50 lines
- All required sections present
- Design tokens reference DESIGN.md values
- When `htmlReference` is non-empty and the file exists, the spec explicitly states that the linked HTML was the fidelity source and the described UI matches it