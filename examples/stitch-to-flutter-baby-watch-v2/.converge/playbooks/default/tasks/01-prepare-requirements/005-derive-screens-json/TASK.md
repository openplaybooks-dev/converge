---
id: 005-derive-screens-json
title: Derive screens.json from references
description: Emit .stitch/screens.json directly from ANALYSIS.md Screen Inventory, pre-filling htmlReference and screenshotReference.
dependencies:
  - 002-analyze-references
  - 004-generate-ux
tags:
  - screens
  - sitemap
inputs:
  - .stitch/references/ANALYSIS.md
  - .stitch/SITE.md
  - .stitch/UX.md
outputs:
  - .stitch/screens.json
checks:
  - id: screens-json-valid
    cmd: python3 -c "import json; json.load(open('.stitch/screens.json'))"
    description: screens.json is valid JSON
  - id: screens-json-is-array
    cmd: python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); sys.exit(0 if isinstance(d,list) and len(d)>0 else 1)"
    description: screens.json is a non-empty array
  - id: screens-json-has-required-fields
    cmd: python3 -c "import json,sys; d=json.load(open('.stitch/screens.json')); req=['id','title','route','htmlReference','screenshotReference']; sys.exit(0 if all(all(k in s for k in req) for s in d) else 1)"
    description: Every screen has id, title, route, htmlReference, screenshotReference
  - id: screens-json-html-refs-exist
    cmd: python3 -c "import json,os,sys; d=json.load(open('.stitch/screens.json')); bad=[s for s in d if s['htmlReference'] and not os.path.exists(s['htmlReference'])]; sys.exit(1 if bad else 0)"
    description: Every non-empty htmlReference points to a file that exists
---

# Derive screens.json from references

Emit `.stitch/screens.json` directly from ANALYSIS.md's Screen Inventory. Replaces v1's two-step breakdown+enrich with one direct derivation.

## Inputs

- `.stitch/references/ANALYSIS.md` — Screen Inventory lists every `code.html` path, layout, and purpose
- `.stitch/SITE.md` — route mapping
- `.stitch/UX.md` — flows, states, overlays

## Rules

One screen entry per row in ANALYSIS.md Screen Inventory, **plus** entries for any app-native screens named in SITE.md that have no reference twin (rare — leave `htmlReference: ""`), **plus** overlay entries for modals/sheets visible inside reference HTML.

### Regular screen entry

```json
{
  "id": "home-safe",
  "title": "Home — Safe",
  "route": "/",
  "description": "Dashboard when all beacons report safe signal.",
  "features": ["map-card", "beacon-strip", "push-mute", "status-pill-safe"],
  "priority": 1,
  "htmlReference": ".stitch/references/babyguard_home_phase_2_safe_updated/code.html",
  "screenshotReference": ".stitch/references/babyguard_home_phase_2_safe_updated/screen.png"
}
```

### State-variant handling

ANALYSIS.md lists 3 home states (safe, weak_signal, alert). Two acceptable approaches — **pick approach B for this playbook**:

- **A. One screen, three variants** — single `home` screen entry with `htmlReference` pointing at the default (safe) state; UI switches via provider state.
- **B. Three separate screen entries** — `home-safe`, `home-weak`, `home-alert` — each pointing at its own reference. The Flutter app renders one of the three based on provider state. This gives each state its own reference for fidelity.

Use **approach B**: emit one entry per state variant. Mark them with `"variant": "safe" | "weak" | "alert"` and `"variantGroup": "home"` so later phases can fold them into a single widget if desired.

### Overlay entry

If a reference `code.html` contains modal or bottom-sheet markup (common for invite-accept, permission prompts), emit:

```json
{
  "id": "invite-accept",
  "title": "Invite Accept",
  "route": "overlay:invite-accept",
  "description": "Dialog to accept/decline a co-guardian invitation.",
  "parentScreenId": "co-guardians-list",
  "overlayType": "dialog",
  "htmlReference": ".stitch/references/co_guardians_list_phase_2/code.html",
  "screenshotReference": ".stitch/references/co_guardians_list_phase_2/screen.png",
  "priority": 2
}
```

### Route assignment

- Home states: `/` for safe (default), `/?state=weak` and `/?state=alert` OR just attach a provider — but the route remains `/`. Use `"route": "/"` for all three home variants; `variant` disambiguates.
- Tab roots (per ANALYSIS.md's 4-tab bottom nav): `/`, `/devices`, `/security`, `/settings`.
- Detail screens: `/<entity>/:id` form.
- Overlays: `overlay:<id>`.

## Success Criteria

- Valid JSON array
- Every entry has `id`, `title`, `route`, `htmlReference`, `screenshotReference`
- `htmlReference` is either `""` or an existing file path
- Every reference in ANALYSIS.md Screen Inventory is represented by at least one entry
- Overlays from overlay-bearing references are present with `overlay:` routes and `parentScreenId`
