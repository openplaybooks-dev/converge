---
rfc: 0047
title: handoff.generate drives AI generation of the review artifact
status: done
type: feat
source: human
priority_tier: tier2
estimate: "2-3 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0047: handoff.generate drives AI generation of the review artifact

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | This document |
| `evaluateReviewGate` helper | **done** | Single verdict classifier shared by task, stub, and gateway gates |
| Prompt injection | **done** | `context-snapshot.ts` appends a "Review artifact" section from `handoff.*` |
| Task artifact enforcement | **done** | `findGaps` folds `handoff.artifact` into output-existence (non-gateway) |
| Scheduler cache enforcement | **done** | `cacheOutputs` helper folds `handoff.artifact` into the cache/skip + ledger-hydration checks too — a cached task whose review artifact is missing now resets and regenerates instead of being skipped (`find-gaps` shares the same helper) |
| `--stub` honors the review gate | **done** | Stub success path applies the verdict gate before returning |
| `converge run --stub` CLI wiring | **done** | `stubMode` was parsed but never forwarded to `run()` — now plumbed |
| Tests (TDD) | **done** | prompt-injection, findGaps enforcement, parse round-trip, e2e approve/reject/revise |
| Fixture → task pattern | **done** | `tests/test-human-review-playbook` `manager-report` is now a task |
| hello-world-review example | **done** | Body writes JSON only; handoff generates the HTML report |
| `pnpm build` | **done** | core + cli clean |
| Changelog entry | **done** | Added under `[Unreleased]` |
| Pre-existing failures | **skip** | `tests/task/mode-parse-task-md.test.ts` had 4 mode-inference failures before this RFC |
| Ledger `handoff` plumbing | **defer** | The CLI `awaiting-review` hint falls back to `outputs[0]` because `handoff` is not persisted into the runtime ledger row; the Studio reads it from TASK.md directly and is unaffected. Tracked as a follow-up. |

## Problem

A task should be able to do its **main work** in the body and separately hand off a
**human-review report** for approval. The `handoff:` block (RFC 0039) already declared the
shape:

```yaml
handoff:
  artifact: output/greeting.preview.html
  format: html
  generate: Generate the HTML report…
  skill: optional-skill
```

But three gaps made it non-functional for tasks:

1. **`handoff.generate` was a dead field.** It is parsed (`task-md-definition.ts:169-174`,
   `:995-1024`) but the agent prompt is the scaffold `TASK.md` built from the body only
   (`context-snapshot.ts`), and the runtime read the block solely to gate into
   `awaiting-review` (`execute-task.ts`). The instruction never reached the agent. (The
   example even used `report:`, which the parser silently ignores.)
2. **The artifact was never verified.** The gate could fire with no report on disk.
3. **`--stub` could not exercise the task flow.** Stub mode early-returns before the gate, so
   the only no-AI path that reaches `awaiting-review` was `mode: gateway` (no body, no work) —
   which cannot demonstrate "task does main work, then generates a report".

`handoff` (task, agent-facing generation instruction) and `review` (gateway, human-facing
`prompt` shown in the review surface) had drifted together. This RFC makes `handoff` work and
keeps the distinction crisp.

## Proposal

- **One shared gate classifier.** `evaluateReviewGate()` in `packages/core/src/task/review.ts`
  reduces the latest verdict to `approved | pending | revise | reject`. The task gate
  (`execute-task.ts`), the gateway gate (`run-gateway.ts`), and the new stub gate all call it.
- **Prompt injection.** `writeContextSnapshot` (and the repair fallback in `task-run.ts`)
  appends a delimited `## Review artifact (generate for human review)` section derived from
  `handoff.{artifact,format,generate,skill}`. The body covers the main work; this section
  covers the report. `review.prompt` is untouched (stays human-facing).
- **Task artifact enforcement.** The `Unit` now carries `handoff`; `findGaps` folds
  `handoff.artifact` into the standard output-existence check for non-gateway tasks. A missing
  report yields the normal `missing-output` gap → FEEDBACK → retry, so the gate never fires
  without the report. Gateways generate nothing and are exempt; the artifact is de-duplicated
  if it is also listed in `outputs:`.
- **`--stub` honors the gate.** On stub success, when the task has a `review`/`handoff` block,
  the stub path applies `evaluateReviewGate` and holds `awaiting-review` exactly like a real
  task run — read from the freshly-parsed def, not the manifest-derived Unit (which drops
  `handoff`). This makes a stubbed task drivable through approve/reject with no live AI.
- **CLI wiring fix.** `converge run --stub` parsed `stubMode` into the options interface but
  never forwarded it into `run()`; both the initial and resume invocations now pass it.

## Handoff vs review

| | `handoff:` (task) | `review:` (gateway, RFC 0039) |
|---|---|---|
| Task shape | Real body + generated report | No body (synchronization point) |
| Generation field | `generate` — instruction to the **agent** | — |
| Human-facing field | — | `prompt` — shown in the **review surface** |
| Artifact enforced | Yes (`findGaps`) | No (gateway produces nothing) |

## Migration

Backwards compatible. The legacy `report:` key was always a no-op (the parser only reads
`generate`), so renaming `report` → `generate` breaks nothing. Folding `handoff.artifact` into
`findGaps` is a behavior change only for tasks that declared `handoff.artifact` and relied
on it **not** being verified — the only in-repo consumer (`hello-world-review`) produces the
artifact.

## Verification

- Unit: `packages/core/tests/unit/task/lifecycle/handoff-prompt-injection.test.ts`,
  `packages/core/tests/unit/task/handoff-artifact-gap.test.ts`,
  `packages/core/tests/task/mode-parse-task-md.test.ts` (round-trip + `report` ignored).
- E2E: `tests/review-flow.test.ts` runs the task fixture with `--stub` through
  `awaiting-review` → approve (→ done), revise → approve, reject (held, verdict recorded), and
  asserts both the main-work output and the handoff report exist before the gate.
- Manual: `cd tests/test-human-review-playbook && converge run --playbook=handoff-review
  --select=manager-report --stub` holds at `awaiting-review` with `docs/findings.json` +
  `docs/review.html` written; `converge review manager-report --approve` resumes to done.
