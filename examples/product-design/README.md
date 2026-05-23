# Product Design Playbook

Transform a product idea into production-ready design documentation, interactive prototypes, and complete design specifications using the **epic → feature → view** hierarchy.

## What This Playbook Does

Models the product owner's workflow to take a raw product idea through:

1. **Idea Intake** → Validated product brief with MVP scope
2. **Research** → Market analysis, user personas, competitive landscape
3. **Epic Decomposition** → High-level product areas identified and prioritized
4. **Feature Analysis** → Features per epic with META.md design rationale, views with sections/tabs/modals sub-catalogs
5. **Design System** → Tokens, shared CSS (base.css + components.css), component archetypes, HTML demos
6. **View Design** → 4-step pipeline: SPEC.md → META.md → state-stacked mockup → production HTML/CSS
7. **Prototype Wiring** → Interactive clickable prototype site connecting all screens
8. **Package** → Complete design handoff with full traceability

## The Hierarchy

```
Epic (high-level product area)
└── Feature (specific capability)
    └── View (UI screen/page)
        ├── Sections (sub-areas of the view)
        ├── Tabs (tabbed content areas)
        └── Modals (dialogs/overlays)
```

Each view produces:
- `SPEC.md` — industry-standard design specification
- `META.md` — design rationale, MVP scope, trade-offs
- `mockup.html` — state-stacked: default/empty/loading/error
- `design.html` — production-ready HTML (imports shared CSS)
- `design.css` — view-specific layout only (components from shared CSS)

## Directory Structure

```
docs/product/              ← All product documentation
├── PRODUCT_BRIEF.md       ← Validated product concept
├── SCOPE.md               ← MVP boundaries
├── EPIC_MAP.md            ← Epic visualization
├── HANDOFF.md             ← Complete handoff document
├── TRACEABILITY.md        ← Epic → Feature → View → Section mapping
├── epics.json             ← Epic catalog (drives feature spawning)
├── research/              ← Research artifacts
│   ├── RESEARCH_REPORT.md
│   ├── user-personas.md
│   └── competitive-analysis.md
└── features/              ← Per-epic feature catalogs
    └── <epic-id>/
        ├── catalog.json   ← Features for THIS epic only
        └── <feature-id>/
            ├── FEATURE.md
            ├── META.md    ← Design rationale
            └── views.json ← Views with sections/tabs/modals sub-catalogs

.design/                   ← Hidden design artifacts
├── system/                ← Design system (shared by ALL views)
│   ├── DESIGN.md          ← Industry-standard spec
│   ├── tokens.css         ← CSS custom properties
│   ├── tokens.json        ← Structured token data
│   ├── base.css           ← Shared foundation: reset, typography, spacing, a11y
│   ├── components.css     ← Reusable patterns: card, button, form, nav, modal, etc.
│   ├── component-archetypes.html
│   ├── page-patterns.html
│   └── token-reference.html
├── screens/               ← Individual screen designs
│   └── <epic-id>/
│       └── <feature-id>/
│           └── <view-id>/
│               ├── SPEC.md
│               ├── META.md
│               ├── mockup.html      (state-stacked QA file)
│               ├── design.html      (imports: tokens.css + base.css + components.css + design.css)
│               └── design.css       (view-specific layout only)
└── prototype/             ← Interactive clickable prototype
    ├── index.html
    ├── navigation.js
    └── styles/
        └── prototype.css
```

## Context Interpolation

Each task receives a bounded "piece of the picture" — a specific catalog file for its work unit:

- `epics.json` → drives 04-features spawn (one epic per spawn)
- `features/<epic-id>/catalog.json` → per-epic feature list (no monolithic master catalog)
- `features/<epic-id>/<feature-id>/views.json` → per-feature views with sections/tabs/modals
- `.design/system/base.css` + `components.css` → shared CSS imported by all views
- View tasks walk the per-epic file tree to discover children

No task reads everything. Each has specific inputs → deterministic outputs.

## CSS Reuse

The design system generates two shared CSS files that ALL views import:

- **`base.css`**: Reset, typography scale, spacing utilities, layout utilities, focus/a11y, density modes
- **`components.css`**: Card, button, form, nav, modal, badge, avatar, alert, table, list, empty-state, skeleton, toast, tab-bar, dropdown

View `design.css` files contain only view-specific page layout — no component definitions, no reset, no typography. This eliminates duplication and ensures consistency.

```html
<link rel="stylesheet" href="../../system/tokens.css">
<link rel="stylesheet" href="../../system/base.css">
<link rel="stylesheet" href="../../system/components.css">
<link rel="stylesheet" href="design.css">  <!-- layout only -->
```

## How to Run

### 1. Provide Your Product Idea

Create `docs/idea.txt`:
```txt
Product Idea: [Name and one-line description]
Problem: [What user pain point does this solve?]
Solution: [How does your product address it?]
Target Users: [Who will use this?]
Success Metrics: [How will you measure success?]
```

### 2. Initialize

```bash
cd examples/product-design
converge init --skills
```

### 3. Run

```bash
converge run --playbook=default --dry    # Preview the DAG
converge run --playbook=default          # Execute
```

### 4. Review Outputs

After completion:
- `docs/product/HANDOFF.md` — Complete design package
- `docs/product/TRACEABILITY.md` — Full hierarchy mapping
- `.design/prototype/index.html` — Open in browser to click through all screens
- `.design/screens/<epic>/<feature>/<view>/design.html` — Individual screen specs
- `.design/system/base.css` + `.design/system/components.css` — Shared CSS foundation

## Skills Reference

| Skill | Purpose | Used By |
|-------|---------|---------|
| research-synthesis | Market/user research methodology | 02-research |
| epic-decomposition | Identifying product areas | 03-epics |
| feature-prioritization | MoSCoW + RICE scoring | 04-features |
| view-identification | Breaking features into screens | 04-features |
| design-system-tokens | CSS/design token creation + shared CSS | 05-design-system |
| design-taste | Quality gate for aesthetics | 05-design-system |
| view-spec-writer | Industry-standard SPEC.md | 06-views → 01-spec |
| view-meta-writer | META.md with rationale | 06-views → 02-meta |
| html-mockup | State-stacked + production HTML | 06-views → 03-mockup, 04-wire |
| prototype-wiring | Interactive prototype site | 07-wire-prototype |

## Validation Checks

| Check | Script | Purpose |
|-------|--------|---------|
| epic-coverage | `validate-epic-coverage.sh` | Every epic has ≥1 feature |
| feature-coverage | `validate-feature-coverage.sh` | Every feature has ≥1 view |
| design-complete | `check-design-completeness.sh` | Every view has all artifacts |
| token-consistency | `validate-token-consistency.sh` | All views use tokens, no raw hex |
| html-structure | `validate-html-structure.sh` | Semantic HTML, ARIA, shared CSS imports |
| css-organization | `validate-css-organization.sh` | Responsive, token-compliant, layout-only |
| catalog-integrity | `validate-catalog-integrity.sh` | Full chain: epics→features→views→sections |
| traceability | inline | TRACEABILITY.md exists with hierarchy |
| prototype-works | inline | Interactive prototype exists |
| meta-reasoning | inline | META.md files exist with rationale |
| design-system-reusable-css | inline | base.css + components.css exist |

## Key Design Decisions

1. **META.md for every feature and view** — captures the "why" behind design decisions, not just the "what"
2. **MVP-first thinking** — every feature explicitly scopes what's in v1 vs deferred
3. **Sections/tabs/modals sub-catalogs** — views decompose into sections documented in views.json
4. **Context interpolation** — each task reads a bounded catalog file, not a monolithic aggregate
5. **Shared CSS foundation** — base.css + components.css imported by all views eliminates duplication
6. **State-stacked mockups** — all variants (default, empty, loading, error) in one HTML file for QA
7. **No external dependencies** — pure HTML/CSS/JS, opens directly in browser
8. **Industry-standard quality** — no emoji, no Lorem Ipsum, no placeholder images, no purple gradients
9. **Design system as foundation** — all screens reference the same tokens, base, and components
10. **Full traceability** — every view traces back through feature META.md to research findings
