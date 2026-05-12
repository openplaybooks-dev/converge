# Repo Split — DAG Blueprint

Split the converge monorepo into a local sibling repository at `../myanlabs`.
The split copies larger projects into `../myanlabs` first, verifies the copies,
then strips those projects from the core framework repo.

## Delegation

| Phase | What it does | Children |
|---|---|---|
| **00-discover** | Audit all candidates before touching anything | 2 static |
| **05-prepare-target** | Create/verify local `../myanlabs` repository layout | 0 |
| **20-split-complex-examples** | Copy 10 standalone examples into `../myanlabs/examples/` | 10 static |
| **30-split-apps** | Copy 3 apps into `../myanlabs/apps/` | 3 static |
| **10-strip-core** | Remove split items + stubs, update configs | 6 static |
| **40-verify-all** | Final audit across both repos | 4 static |

## DAG Edges

```
00-discover
    │
    ▼
05-prepare-target
    │
    ├──────────────────────┐
    ▼                      ▼
20-split-complex-examples  30-split-apps
    │                      │
    └──────────┬───────────┘
               ▼
         10-strip-core
               │
               ▼
         40-verify-all
```

Phases 20 and 30 run in parallel after `../myanlabs` is prepared. Core stripping
waits for both copy phases so it never deletes its own source inputs.

## What moves where

| Destination | Count | Items |
|---|---|---|
| `../myanlabs/examples/` | 10 complex examples | game-aiwolf, game-assets-3d, baby-app, stitch-to-flutter-baby-watch-v2, autonomous-pentest, cinematic-video-production, financial-deep-research, converge-design, unity-remix, unity-mono-remix |
| `../myanlabs/apps/` | 3 apps | landing, playbooks-to, planner |
| Stay in monorepo | 16 simple examples | hello-world, agentic-calculator, data-pipeline, deep-research, scientific-research, frontier-research, evolutionary-optimization, fullstack-app, social-sim, game-assets, game-assets-video, game-assets-3d-meshy, acp-demo, flutter-app, stitch-to-flutter, stitch-to-flutter-baby-watch |
| Deleted | 3 stubs | game-ai-pk, context-chain-demo.ts, apps/studio |

## Key decisions

- **Local-first split** — `../myanlabs` is the destination repo; no GitHub calls are required.
- **Copy before delete** — split targets are copied and verified before core cleanup.
- **Preserve source dotfiles** — use `rsync -a` with explicit excludes instead of `cp -r *`.
- **Do not copy generated bulk** — exclude dependency caches, build outputs, Converge runtime state, and nested `.git` directories.
- **Planner dependency fix** — replace `workspace:*` references with a documented local or published converge dependency before verification.
