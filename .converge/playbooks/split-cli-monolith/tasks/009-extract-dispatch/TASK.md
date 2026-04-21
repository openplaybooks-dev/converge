---
id: 009-extract-dispatch
title: "PR9 — Extract cli/dispatch/* from main.ts switch"
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 009-extract-dispatch
  title: "PR9 — Extract cli/dispatch/* from main.ts switch"
  tier: A
  task: Highest-risk PR. Each case in the main switch becomes a module call.
  spec: "Extract dispatch handlers from `cli/main.ts` switch into `cli/dispatch/`:\n\n| New file | Lines | Source range |\n| --- | --- | --- |\n| `cli/dispatch/run.ts` | ~250 | \"run\" case incl. `--playbook` wrapper L325–592 |\n| `cli/dispatch/plan.ts` | ~180 | \"plan\" case + `buildPlanTaskMd` L766–925 + L1219–1262 |\n| `cli/dispatch/show.ts` | ~60 | \"show\" case |\n| `cli/dispatch/skills.ts` | ~30 | \"skills\" case |\n| `cli/dispatch/playbook.ts` | ~40 | \"playbook\" case |\n| `cli/dispatch/simple.ts` | ~150 | remaining subcommand routers |\n\nAfter this PR, `cli/main.ts` should be ~250 lines — only imports, top-level try/catch, dispatch switch calling into modules.\n\n**Run full smoke matrix:**\n```bash\nconverge --help\nconverge status\nconverge verify\nconverge run --dry --max-iterations=1 --playbook=default\nconverge show gantt && converge show graph\nconverge inspect\nconverge plan \"test prompt\" --dry\n```\nPlus SIGINT test during `converge run` — must exit within 10s, no zombie children.\n\n**Acceptance:**\n- All smoke checks pass with identical output to pre-PR baseline\n- `cli/main.ts` ≤300 lines\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\009-extract-dispatch"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR9 — Extract cli/dispatch/* from main.ts switch

**Tier:** A

**Summary:** Highest-risk PR. Each case in the main switch becomes a module call.

## Full specification

Extract dispatch handlers from `cli/main.ts` switch into `cli/dispatch/`:

| New file | Lines | Source range |
| --- | --- | --- |
| `cli/dispatch/run.ts` | ~250 | "run" case incl. `--playbook` wrapper L325–592 |
| `cli/dispatch/plan.ts` | ~180 | "plan" case + `buildPlanTaskMd` L766–925 + L1219–1262 |
| `cli/dispatch/show.ts` | ~60 | "show" case |
| `cli/dispatch/skills.ts` | ~30 | "skills" case |
| `cli/dispatch/playbook.ts` | ~40 | "playbook" case |
| `cli/dispatch/simple.ts` | ~150 | remaining subcommand routers |

After this PR, `cli/main.ts` should be ~250 lines — only imports, top-level try/catch, dispatch switch calling into modules.

**Run full smoke matrix:**
```bash
converge --help
converge status
converge verify
converge run --dry --max-iterations=1 --playbook=default
converge show gantt && converge show graph
converge inspect
converge plan "test prompt" --dry
```
Plus SIGINT test during `converge run` — must exit within 10s, no zombie children.

**Acceptance:**
- All smoke checks pass with identical output to pre-PR baseline
- `cli/main.ts` ≤300 lines
- `pnpm typecheck` + `pnpm test` green

---

Runs the full pipeline: **analyze → implement → review → quality**.
