# META.md — Beacon Scanner Design

## Example Selection

**Linked reference HTML used (fidelity target):** `.stitch/references/th_m_beacon_phase_2/code.html`

The design.html mirrors the linked reference HTML structure, section order, hierarchy, spacing rhythm, and visible text/icons as closely as the Flutter HTML Glossary allows.

## Glossary Compliance

- Scaffold root: `.scaffold` class
- AppBar: `.app-bar` class
- Body: `.body` class
- Cards: `.card` class with `data-color="primary"` for ColorScheme roles
- Colors applied via Tailwind using design system palette

## Compromises (where glossary had no 1:1 mapping)

- `data-flutter="scaffold"` → replaced with `.scaffold` class per glossary
- `data-flutter="app-bar"` → replaced with `.app-bar` class per glossary
- `data-flutter` attributes not used; Flutter widget identity expressed via CSS classes per glossary examples
- Bottom navigation not included (not in design spec for this screen)

## Score Table

N/A — linked HTML was set and valid, used as fidelity target directly.