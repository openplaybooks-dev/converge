# Product Design Playbook — PLAN

Build a complete product design package from idea to production-ready specifications with interactive prototype. Models the product owner's perspective with epic → feature → view hierarchy.

## DAG

```
01-intake              (docs/product/PRODUCT_BRIEF.md, SCOPE.md)
    ↓
02-research            (docs/product/research/*)
    ↓
03-epics               (docs/product/epics.json, EPIC_MAP.md)
    ↓
04-features            (mode: spawner → feature-analysis per epic)
    │                  Each feature: FEATURE.md + META.md + views.json (with sections/tabs/modals)
    │                  Per-epic catalog only — no master aggregate
    ↓
05-design-system       (.design/system/DESIGN.md, tokens.css, tokens.json, base.css, components.css, HTML demos)
    ↓
06-views               (mode: spawner → view-design per view)
    │                  Walks per-epic catalog tree (no master catalog)
    │                  4-step pipeline: spec → meta → mockup → html-spec
    │                  Each view: SPEC.md + META.md + mockup.html + design.html + design.css
    │                  design.html imports: tokens.css + base.css + components.css + design.css
    ↓
07-wire-prototype      (.design/prototype/ — interactive clickable mockup site)
    ↓
08-package             (docs/product/HANDOFF.md, TRACEABILITY.md)
```

## Key Hierarchy

- **Epic**: High-level product area (e.g., "User Management", "Content Creation")
- **Feature**: Specific capability within an epic (e.g., "Authentication", "Post Editor")
- **View**: UI screen that implements part of a feature (e.g., "Login Form", "Editor Canvas")
- **Section**: Sub-area within a view (e.g., "Search Filters", "Results List")
- **Tab**: Tabbed content area within a view
- **Modal**: Dialog/overlay within a view

## Output Locations

- **Product docs**: `docs/product/` — briefs, research, features, handoff
- **Design artifacts**: `.design/` — design system, screen designs, prototype
- **Features data**: `docs/product/features/` — per-epic catalogs with views.json (includes sections/tabs/modals)

## Context Interpolation

Each task receives a bounded piece of the picture:
- `epics.json` → drives 04-features spawn (one epic per spawn)
- `features/<epic-id>/catalog.json` → per-epic feature list (written by feature-analysis template)
- `features/<epic-id>/<feature-id>/views.json` → per-feature views with sections/tabs/modals (written by feature-analysis template)
- `.design/system/` → shared CSS (base.css + components.css) imported by all views
- No monolithic master catalog — tasks discover children by walking the per-epic file tree

## Authoritative Source Files

- User-provided `docs/idea.txt` (initial product concept)
- Generated `docs/product/epics.json` (drives feature spawning)
- Per-epic `docs/product/features/<epic-id>/catalog.json` (drives view discovery)
- Per-feature `docs/product/features/<epic-id>/<feature-id>/views.json` (sections/tabs/modals catalog)
- Generated `.design/system/DESIGN.md` (referenced by all views)
- Generated `.design/system/base.css` (shared foundation — all views import)
- Generated `.design/system/components.css` (reusable components — all views import)
