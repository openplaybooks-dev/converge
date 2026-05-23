---
rfc: 0038
title: Local browser studio for interactive planning and human feedback
status: done
type: feat
source: human
priority_tier: tier2
estimate: "1-2 weeks"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0038: Local browser studio for interactive planning and human feedback

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Written and implemented |
| Tests (TDD) | **done** | Added `packages/studio/tests/add-ui.test.ts` |
| Browser studio | **done** | `converge add --ui` serves local planning UI from `@openplaybooks/converge-studio` |
| Draft persistence | **done** | Planning state persists under `.converge/ui/add/` |
| Publish flow | **done** | Accepted plan publishes into `.converge/playbooks/<name>/` |
| `pnpm test` | **done** | Targeted browser-flow test passes |
| Changelog entry | **done** | Added under `[Unreleased]` |
| Pre-existing failures | **skip** | Unrelated CLI type errors remain in the repo |

## Problem

The current `converge init`/`converge add --from-prompt` flow is CLI-first and
single-shot: the planner analyzes a prompt, scaffolds a playbook, and the user
inspects the result after the fact. That works for quick starts, but it does not
support the workflow the README is moving toward:

- planning itself should be interactive
- the user should be able to refine the plan through an HTML UI
- the same local browser should later serve run-time visibility and human
  feedback tasks

## Proposal

Add a localhost browser studio behind `converge add --ui`.

### Planning flow

1. The user opens the browser UI and enters the goal, playbook name, and any
   initial constraints.
2. The server runs the existing planner playbook and writes draft artifacts to
   disk.
3. The UI renders the draft as HTML, shows the task breakdown, and captures
   feedback in a form.
4. Each feedback submission reruns the planner against the draft, keeping the
   draft on disk so the session is resumable.
5. When the user accepts the plan, the draft is translated into the actual
   playbook folder under `.converge/playbooks/<name>/`.

### Runtime surface

The same local server also exposes a read-only inspection surface for playbook
execution and a task-specific HTML feedback surface for human-in-the-loop
steps. The first implementation can be minimal, but it must reuse the same
filesystem artifacts and local-only server model as planning.

## Implementation shape

- Keep the current playbook/task/journal model as the source of truth.
- Persist draft planning state on disk under `.converge/` so sessions can be
  resumed after a crash.
- Reuse the existing planner playbook rather than inventing a separate planning
  engine.
- Keep the server local-only, with no auth and no remote persistence.

## Verification

- `converge add --ui` starts a local server and serves the planning page.
- A planning session can be started, revised, and accepted through HTML forms.
- The accepted plan produces a real playbook folder.
- Existing CLI-only flows continue to work unchanged.
