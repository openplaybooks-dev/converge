# App Builder

Autonomous React app generation. This example takes an `idea.md` and walks through requirements, visual direction, asset generation, screen building, behavior wiring, and final verification to produce a **buildable `Vite + React + TypeScript` app**.

The generated app is intentionally biased toward:

- bold themes and expressive typography
- image-backed backgrounds and hero art
- mock-data-driven consumer flows
- playful interactions like theme switching, drag/drop, quizzes, animated cards, and persistent preferences

## What it demonstrates

- a multi-phase Converge playbook modeled after `flutter-app`, but adapted for React web delivery
- dynamic per-asset and per-screen spawning from `.stitch` manifests
- example-local skills for React layout, theming, animation, routing, testing, and web UI generation
- final convergence gates that run real build/test checks instead of only checking for file existence

## Setup

```bash
export MINIMAX_API_KEY=sk-...
```

The bundled `.converge/project.yml` routes both `claude` and `acp` through MiniMax's Anthropic-compatible endpoint. Override `ANTHROPIC_BASE_URL` / `ANTHROPIC_MODEL` if you want a different provider.

Node.js and `npm` must be installed locally. The playbook's goal checks run `npm install`, `npm run build`, and `npm run test -- --run`.

## Run

```bash
cd examples/app-builder
converge run
```

After convergence:

```bash
npm install
npm run dev
```

## Phases

| # | Phase | Produces |
|---|-------|----------|
| 01 | `01-prepare-requirements` | `PRD.md`, `.stitch/UX.md`, `.stitch/screens.json`, `.stitch/SITE.md` |
| 02 | `02-design-system` | `.stitch/system/DESIGN.md`, `.stitch/system/META.md`, HTML design references |
| 03 | `03-generate-assets` | `.stitch/assets/manifest.json`, generated background and hero images |
| 04 | `04-build-screens` | app scaffold, route screens, shared React components |
| 05 | `05-add-behavior` | mock data, state, interaction manifests, playful feature modules |
| 06 | `06-wire-and-verify` | router wiring, tests, interaction mounting, final verification |

## Convergence goals

```yaml
goals:
  - react-build          # npm install && npm run build
  - react-test           # npm install && npm run test -- --run
  - has-theme            # src/theme/theme.css exists
  - has-router           # src/app/router.tsx exists
  - assets-and-interactivity
```

## Structure

```text
.converge/
├── project.yml
├── skills/
└── playbooks/default/
    ├── playbook.yml
    ├── tasks/
    └── templates/
```
