---
description: >
  Rewrite README.md: replace inline examples table with two sections —
  "Examples (in this repo)" for the 16 staying, and "Standalone Projects"
  with links to the 10 split example repos + 3 app repos.
inputs:
  - README.md
outputs:
  - README.md (modified)
checks:
  - id: examples-section-exists
    cmd: grep -q "Examples (in this repo)" README.md
  - id: standalone-section-exists
    cmd: grep -q "Standalone Projects" README.md
  - id: no-stale-example-paths
    cmd: grep -c "\.\/examples\/game-aiwolf\|\.\/examples\/game-assets-3d\|\.\/examples\/baby-app\|\.\/examples\/stitch-to-flutter-baby-watch-v2\|\.\/examples\/autonomous-pentest\|\.\/examples\/cinematic-video-production\|\.\/examples\/financial-deep-research\|\.\/examples\/converge-design\|\.\/examples\/unity-remix\|\.\/examples\/unity-mono-remix" README.md || test $? -eq 1
  - id: badge-updated
    cmd: grep -q "examples" README.md
skills: []
references: []
vars: {}
depends_on: []
---

Rewrite the README.md examples section (currently lines 58-95, the "What you can build" table).

Replace the inline examples table with:

```markdown
## What you can build

Every example below is a real, runnable playbook in [`examples/`](./examples/).

### Examples (in this repo)

These are converge playbook demos and getting-started material:

| Example | Description |
|---|---|
| [`hello-world`](./examples/hello-world/) | Simplest possible playbook — creates a file and verifies it exists |
| [`agentic-calculator`](./examples/agentic-calculator/) | Recursive tree calculator — proves core diverge/converge pattern |
| [`data-pipeline`](./examples/data-pipeline/) | Sequential pipeline: fetch → transform → validate |
| [`deep-research`](./examples/deep-research/) | Layered deep research with iterative deepening |
| [`scientific-research`](./examples/scientific-research/) | Bayesian reasoning, GRADE evidence, meta-analysis |
| [`frontier-research`](./examples/frontier-research/) | Beam-search frontier research |
| [`evolutionary-optimization`](./examples/evolutionary-optimization/) | LLM training config evolution via genetic algorithms |
| [`fullstack-app`](./examples/fullstack-app/) | Seed-driven dynamic backend + frontend generation |
| [`social-sim`](./examples/social-sim/) | Social simulation |
| [`game-assets`](./examples/game-assets/) | 2D game sprite generation |
| [`game-assets-video`](./examples/game-assets-video/) | Platformer asset pack via video pipeline |
| [`game-assets-3d-meshy`](./examples/game-assets-3d-meshy/) | 3D asset generation using Meshy API |
| [`acp-demo`](./examples/acp-demo/) | ACP (Agent SDK) provider integration demo |
| [`flutter-app`](./examples/flutter-app/) | Autonomous Flutter mobile app generation |
| [`stitch-to-flutter`](./examples/stitch-to-flutter/) | Flutter app from Stitch AI designs |
| [`stitch-to-flutter-baby-watch`](./examples/stitch-to-flutter-baby-watch/) | Child safety BLE beacon app |

### Standalone Projects

Larger projects that have been split into their own repositories:

| Project | Repo | Description |
|---|---|---|
| game-aiwolf | [myanlabs/game-aiwolf](https://github.com/myanlabs/game-aiwolf) | Full game development studio with 41 sub-agents |
| game-assets-3d | [myanlabs/game-assets-3d](https://github.com/myanlabs/game-assets-3d) | TypeScript Lego-block library for low-poly 3D assets |
| baby-app | [myanlabs/baby-app](https://github.com/myanlabs/baby-app) | Flutter novel-reader mobile app |
| baby-watch-v2 | [myanlabs/stitch-to-flutter-baby-watch-v2](https://github.com/myanlabs/stitch-to-flutter-baby-watch-v2) | Production child safety BLE beacon app |
| autonomous-pentest | [myanlabs/autonomous-pentest](https://github.com/myanlabs/autonomous-pentest) | 6-stage autonomous penetration testing |
| cinematic-video-production | [myanlabs/cinematic-video-production](https://github.com/myanlabs/cinematic-video-production) | End-to-end AI film director |
| financial-deep-research | [myanlabs/financial-deep-research](https://github.com/myanlabs/financial-deep-research) | Professional equity research on Vietnamese stocks |
| converge-design | [myanlabs/converge-design](https://github.com/myanlabs/converge-design) | AI-powered design and landing page generator |
| unity-remix | [myanlabs/unity-remix](https://github.com/myanlabs/unity-remix) | Analyze shipping Unity game, produce starter project |
| unity-mono-remix | [myanlabs/unity-mono-remix](https://github.com/myanlabs/unity-mono-remix) | Unity Mono variant analysis pipeline |

### Apps

| App | Repo | Description |
|---|---|---|
| Landing | [myanlabs/converge-landing](https://github.com/myanlabs/converge-landing) | Converge landing page (Astro + Cloudflare) |
| Planner | [myanlabs/converge-planner](https://github.com/myanlabs/converge-planner) | Converge DAG planner UI (Next.js) |
| Playbooks.to | [myanlabs/playbooks-to](https://github.com/myanlabs/playbooks-to) | Playbooks directory site (Astro + Cloudflare) |
```

Also update the badges at the top:
- Change `examples-26%2B` to `examples-16` 
- Remove the "What you can build" soft-links that reference split examples
