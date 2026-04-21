---
id: 008-extract-args-bootstrap
title: PR8 — Extract cli/args/ and cli/bootstrap/ from main.ts
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 008-extract-args-bootstrap
  title: PR8 — Extract cli/args/ and cli/bootstrap/ from main.ts
  tier: A
  task: Pure cut-and-paste from main.ts. No logic changes.
  spec: "Extract from `cli/main.ts` (1280L) into dedicated modules:\n\n| New file | Lines | Source range (main.ts) |\n| --- | --- | --- |\n| `cli/args/parse.ts` | ~120 | `parseArgs` L82–143 |\n| `cli/args/redirects.ts` | ~40 | `REDIRECTS` map + handler L305–321 |\n| `cli/bootstrap/shutdown.ts` | ~60 | `shutdownController` singleton + `setupGracefulShutdown` L190–229 |\n| `cli/bootstrap/scope.ts` | ~90 | 3-strategy playbook auto-detect L244–291 |\n| `cli/bootstrap/entry.ts` | ~30 | Windows `_isMain` guard L1274–1278 |\n\n**Critical invariants — do NOT alter:**\n- `shutdownController` must be exported as a *named const* singleton, never re-created per call\n- `scope.ts` 3-strategy detection order is order-sensitive — preserve exactly; sets `CONVERGE_PLAYBOOK` env var\n- `entry.ts` keeps `realpathSync` + `pathToFileURL` fallback verbatim\n- `process.env.PYTHONIOENCODING` line (main.ts L14–15) stays at top of `main.ts` — do not move\n\n**Acceptance:**\n- PR1 parse + scope suites green\n- Smoke matrix (every subcommand with `--help`) shows unchanged output\n- SIGINT during `converge run` still exits within 10s (shutdown handler intact)"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\008-extract-args-bootstrap"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR8 — Extract cli/args/ and cli/bootstrap/ from main.ts

**Tier:** A

**Summary:** Pure cut-and-paste from main.ts. No logic changes.

## Full specification

Extract from `cli/main.ts` (1280L) into dedicated modules:

| New file | Lines | Source range (main.ts) |
| --- | --- | --- |
| `cli/args/parse.ts` | ~120 | `parseArgs` L82–143 |
| `cli/args/redirects.ts` | ~40 | `REDIRECTS` map + handler L305–321 |
| `cli/bootstrap/shutdown.ts` | ~60 | `shutdownController` singleton + `setupGracefulShutdown` L190–229 |
| `cli/bootstrap/scope.ts` | ~90 | 3-strategy playbook auto-detect L244–291 |
| `cli/bootstrap/entry.ts` | ~30 | Windows `_isMain` guard L1274–1278 |

**Critical invariants — do NOT alter:**
- `shutdownController` must be exported as a *named const* singleton, never re-created per call
- `scope.ts` 3-strategy detection order is order-sensitive — preserve exactly; sets `CONVERGE_PLAYBOOK` env var
- `entry.ts` keeps `realpathSync` + `pathToFileURL` fallback verbatim
- `process.env.PYTHONIOENCODING` line (main.ts L14–15) stays at top of `main.ts` — do not move

**Acceptance:**
- PR1 parse + scope suites green
- Smoke matrix (every subcommand with `--help`) shows unchanged output
- SIGINT during `converge run` still exits within 10s (shutdown handler intact)

---

Runs the full pipeline: **analyze → implement → review → quality**.
