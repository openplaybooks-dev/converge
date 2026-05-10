# Repo Split — DAG Blueprint

Three-way split of the converge monorepo using `gh` CLI.

## Delegation

| Phase | What it does | Children |
|---|---|---|
| **00-discover** | Audit all candidates before touching anything | 2 static |
| **10-strip-core** | Remove split items + stubs, update configs | 6 static |
| **20-split-complex-examples** | 10 individual repos for standalone projects | 10 static |
| **30-split-apps** | 3 individual repos for deployable apps | 3 static |
| **40-verify-all** | Final audit across all repos | 4 static |

## DAG Edges

```
00-discover
    │
    ▼
10-strip-core
    │
    ├──────────────────────┐
    ▼                      ▼
20-split-complex-examples  30-split-apps
    │                      │
    └──────────┬───────────┘
               ▼
         40-verify-all
```

Phases 20 and 30 run in parallel after 10 completes. Phase 40 waits for both.

## What moves where

| Destination | Count | Items |
|---|---|---|
| Split to own repos | 10 complex examples | game-aiwolf, game-assets-3d, baby-app, baby-watch-v2, autonomous-pentest, cinematic-video-production, financial-deep-research, converge-design, unity-remix, unity-mono-remix |
| Split to own repos | 3 apps | landing, playbooks-to, planner |
| Stay in monorepo | 16 simple examples | hello-world, agentic-calculator, data-pipeline, deep-research, scientific-research, frontier-research, evolutionary-optimization, fullstack-app, social-sim, game-assets, game-assets-video, game-assets-3d-meshy, acp-demo, flutter-app, stitch-to-flutter, stitch-to-flutter-baby-watch |
| Deleted | 3 stubs | game-ai-pk, context-chain-demo.ts, apps/studio |

## Key decisions

- **No npm publish** — only planner has converge deps, uses git references
- **Fresh git history** — each repo starts with a single clean commit
- **All repos public** — matching the MIT license
- **gh CLI for everything** — create, push, verify
