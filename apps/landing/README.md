<div align="center">

# `@converge/landing`

The public site for [Converge](https://github.com/myanlabs/converge) — `converge.dev`.

[![Astro](https://img.shields.io/badge/Astro-6.x-BC52EE.svg)](https://astro.build/)
[![Starlight](https://img.shields.io/badge/Starlight-docs-7B5CFF.svg)](https://starlight.astro.build/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38BDF8.svg)](https://tailwindcss.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020.svg)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

</div>

This package is the marketing landing page and documentation portal for the Converge framework. It is built with [Astro 6](https://astro.build/) and [Starlight](https://starlight.astro.build/), styled with Tailwind v4, and deployed to Cloudflare Pages.

If you are looking for the framework itself, start at the [repository root](../../README.md) or the [`@converge/core` package](../../packages/core/README.md).

---

## Quick start

From the repository root (the landing app shares the workspace's `pnpm` install):

```bash
pnpm install                 # once, at the repo root
pnpm --filter @converge/landing dev       # http://localhost:4321
pnpm --filter @converge/landing build     # static build to ./dist
pnpm --filter @converge/landing preview   # serve the production build locally
pnpm --filter @converge/landing check     # astro check (types + content schema)
```

Or, working inside `apps/landing/`:

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check
```

### Requirements

- **Node.js** ≥ 20
- **pnpm** 10.29.3+ (pinned via the root `packageManager` field)

---

## What this site presents

The landing page exists to communicate one idea: **define done, and Converge gets there.** Two concepts carry most of that weight, and both are surfaced prominently on the site. They are summarized here so contributors editing the marketing copy stay grounded in the actual semantics of the framework.

### The task tree

A Converge project is a hierarchy of tasks on disk. Each task is a markdown file with frontmatter declaring its `outputs` (the files it must produce) and `checks` (shell commands that must exit `0` for the task to count as done). Children may be authored statically or **spawned at runtime** by a Work-Breakdown-Structure (WBS) script, so the tree's shape can depend on what the project's data turns out to look like.

The runtime view of the tree is what `converge status` prints:

```
.converge/playbooks/landing-page/tasks/
    ├── ✓  1-5. 01-prepare-spec        [4/4 done]
    ├── ✓ 6-11. 02-bootstrap-astro     [5/5 done]
    ├── ◑  18. 04-build-sections       (seeded)  [40/48 done, 8 pending]
    └── ○ 46-55. 10-verify       ▶     [3/9 done, 6 pending]
            ├── ✓ 47. 001-build-clean
            ├── ⟳ 48. 002-dev-smoke    ← currently running
            └── ○ ...
```

| Symbol | Meaning |
|---|---|
| `✓` | Complete — every check passed |
| `○` | Pending — not yet attempted |
| `◑` | Seeded — a WBS parent with children, partially done |
| `⟳` | Running |
| `▶` | Next to be executed |
| `✗` | Failed |
| `🚫` | Blocked on a missing input |

The tree is the source of truth — there is no separate plan, schedule, or in-memory DAG. Every decision the runtime makes flows from this on-disk state, which is what makes runs **crash-safe and resumable**: kill the process at any moment and the tree still describes exactly where the work was.

### The two main loops

Converge is built around two nested control loops. The outer loop decides *what to plan*; the inner loop decides *how to converge a single task*. Keeping them separate is what lets the framework scale from a single playbook to large multi-wave runs without losing determinism.

#### 1. The outer loop — convergence waves

Defined in [`packages/core/src/converge/converge-runner.ts`](../../packages/core/src/converge/converge-runner.ts). One iteration is a **wave** — a planning round followed by full execution of every task it generated:

```text
while (!converged) {
    evaluateGoals()    // RED:    run dod.js, measure the gap to "done"
    planFromGoals()    // YELLOW: invoke the planning agent → TASK.md files
    autonomousRun()    // GREEN:  execute everything the wave produced
}
```

The outer loop is closed-loop control: the gap-ledger records each wave's score, the runner watches the trend, and convergence stops when the score reaches the goal or the budget is exhausted. Failed waves do not blindly retry — the next iteration plans *from the new gap state*, so corrections are targeted rather than speculative.

#### 2. The inner loop — the navigator

Defined in [`packages/core/src/navigator/core/navigator.ts`](../../packages/core/src/navigator/core/navigator.ts). One iteration is **one action** against a single task: detect gaps, pick the highest-priority one, dispatch it to a handler, verify, and inject any follow-on nodes the result requires:

```text
while (actionCount < maxActions) {
    snapshot       = capture current gap state from disk
    nextNode       = pick highest-priority buffered node
    result         = handler(nextNode, snapshot)
    if (result.gaps) injectResponseNodes(result.gaps, cycle)
    if (real action) injectPostActionNodes()   // verify, check-stall, advance-attempt
    persist(graph)                              // crash-safe checkpoint
}
```

The graph is built **just-in-time** — only the nodes that current state warrants are added. A successful action injects verification nodes; a failing action that surfaces gaps injects repair nodes; a stalled cycle bumps the attempt counter and tries a different repair strategy. The graph that exists at the end is exactly the actions that ran. (See [`docs/advanced/02-jit-graph-construction.md`](../../docs/advanced/02-jit-graph-construction.md) for the full rationale.)

#### How they fit together

```text
┌─────────────────────────  outer loop (waves)  ─────────────────────────┐
│                                                                        │
│   evaluateGoals → planFromGoals → autonomousRun                        │
│                                       │                                │
│                                       ▼                                │
│                ┌──────────  inner loop (per task)  ──────────┐         │
│                │  detect gaps → pick action → execute →      │         │
│                │  inject response/post-action nodes → verify │         │
│                └──────────────────────────────────────────────┘         │
│                                       │                                │
│                                       ▼                                │
│                           wave complete → re-measure                   │
└────────────────────────────────────────────────────────────────────────┘
```

The outer loop owns *which problems exist*; the inner loop owns *how each problem gets solved*. Both are deterministic at their boundary: the outer loop's verdict is a numeric score from `dod.js`; the inner loop's verdict is a shell exit code. AI judgement lives strictly inside the handlers.

---

## Project structure

```
apps/landing/
├── astro.config.mjs        # Astro + Starlight + Cloudflare adapter wiring
├── tailwind.config.mjs     # Tailwind v4 design tokens
├── wrangler.toml           # Cloudflare Pages config (binding: ASSETS_BUCKET)
├── public/                 # Static assets, OG images, favicons, _headers/_redirects
└── src/
    ├── components/
    │   ├── animations/     # GSAP / Lenis-driven motion primitives
    │   ├── layout/         # Container, Header, Footer, Section, Grid, …
    │   ├── sections/       # Hero, FeatureGrid, Architecture, Quickstart, FAQ, …
    │   └── ui/             # Button, Card, CodeBlock, Pill, Icon, …
    ├── content/
    │   ├── docs/           # Starlight-managed documentation collection
    │   └── blog/           # MDX blog posts
    ├── icons/              # Inline SVG icons
    ├── layouts/            # MainLayout / Layout shells
    ├── pages/              # Route entries (index, blog, og/, rss.xml.ts, 404)
    └── styles/             # Tokens, typography, animations, globals
```

The Starlight sidebar is generated from `src/content/docs/` using the directory map in `astro.config.mjs`. To add a new docs section, drop markdown files under the matching directory (`getting-started/`, `examples/`, `guides/`, `concepts/`, `reference/`, `troubleshooting/`, or `advanced/`) — the sidebar updates automatically.

---

## Deploying

The site is deployed to **Cloudflare Pages**. The build output is `./dist`, with the Cloudflare adapter enabled when `CLOUDFLARE_ADAPTER` is set:

```bash
CLOUDFLARE_ADAPTER=1 pnpm --filter @converge/landing build
pnpm --filter @converge/landing exec wrangler pages deploy ./dist
```

`public/_headers` and `public/_redirects` are served verbatim by Pages. `wrangler.toml` binds an `ASSETS_BUCKET` for static asset access from any Pages function.

---

## Quality gates

The landing app ships with the same verification posture as the rest of Converge:

```bash
pnpm --filter @converge/landing exec astro check        # types + content schemas
pnpm --filter @converge/landing exec linkinator ./dist  # internal link integrity
pnpm --filter @converge/landing exec lighthouse <url>   # perf / a11y / SEO budget
pnpm --filter @converge/landing exec pa11y-ci           # accessibility regressions
pnpm --filter @converge/landing exec prettier --check . # formatting
```

Run these against a built `./dist` before opening a PR that touches templates or content.

---

## Contributing

Contribution rules live in the repo-root [`CONTRIBUTING.md`](../../CONTRIBUTING.md). For copy and content changes, prefer a small PR with a screenshot or screen recording — the visual surface is the contract.

---

## License

MIT — see [LICENSE](./LICENSE).
