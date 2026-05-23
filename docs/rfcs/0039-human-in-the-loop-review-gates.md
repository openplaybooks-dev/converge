---
rfc: 0039
title: Human-in-the-loop review gates for phase-based playbooks
status: draft
type: feat
source: human
priority_tier: tier2
estimate: "1-2 weeks"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0039: Human-in-the-loop review gates for phase-based playbooks

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Drafted from the current `examples/product-design` flow and the existing browser review surface |
| Tests (TDD) | **defer** | To be added with implementation |
| Review-gate runtime | **defer** | New `review:` metadata and gateway gating behavior |
| Product-design example | **defer** | Add review gates at phase boundaries |
| Browser studio integration | **defer** | Reuse the existing human review artifact flow |
| `pnpm build` | **skip** | RFC-only change |
| Changelog entry | **skip** | Add when the implementation ships |
| Pre-existing failures | **skip** | Leave the current in-flight worktree changes untouched |

## Problem

`examples/product-design` is already a phase pipeline, not a flat task list. It moves from intake and research into epic decomposition, then into two spawned fan-out waves, then through a handoff phase. The current example documents that structure clearly in both the README and the playbook plan: intake, research, epics, feature analysis, design system, view design, prototype wiring, and package/handoff are all distinct phases with clear boundaries (`examples/product-design/README.md:7-16`, `examples/product-design/.converge/playbooks/default/PLAN.md:5-28`).

Those boundaries are the natural places where a human wants to look at the work and decide whether the next phase should proceed. Today that decision is handled out of band. The playbook can produce the research package, design system, or prototype, but nothing in the framework says "pause here, present this artifact, and wait for approval."

The closest existing primitive is `mode: gateway`. But the gateway contract is only a synchronization point: no body, no outputs, and no spawn/converge blocks (`packages/core/src/task/mode/schema.ts:260-283`). That is useful as a structural barrier, but it does not carry a review contract. It cannot say which artifact a human should inspect, how the decision is recorded, or how the next phase is unblocked.

The browser studio already has the human decision model we need. It records `approve` / `revise` / `reject`, persists review entries under `.converge/ui/reviews/<playbook>/<taskId>.jsonl`, and renders a persisted HTML review artifact for each review task (`packages/studio/src/add-ui.ts:39-55`, `packages/studio/src/add-ui.ts:1264-1770`, `packages/studio/src/add-ui.ts:1584-1657`). But that surface is currently scoped to `converge add --ui` planning, not to playbook execution. The review UI exists; the playbook contract does not.

## Proposal

Add a reusable human-in-the-loop review-gate pattern built on `mode: gateway`.

The pattern is:

1. A playbook inserts a gateway task between two production phases.
2. That gateway task declares a `review:` block naming the artifact to present and a short prompt for the human reviewer.
3. The browser studio renders the artifact, captures one of the existing decisions (`approve`, `revise`, `reject`), and persists the result in the same local review journal used by the studio today.
4. The gateway completes only when the latest decision is `approve`.
5. `revise` keeps the gate open and exposes feedback for the upstream phase.
6. `reject` halts progression with a structured reason and leaves the next phase blocked.

The key constraint is that this does **not** add a new task mode. The gate remains a `gateway` task, which keeps the four-mode cap intact and avoids introducing a separate approval lifecycle (`packages/core/src/task/mode/schema.ts:9-15`, `packages/core/src/task/mode/schema.ts:260-283`).

### Proposed review-gate shape

```yaml
---
id: 02-research-review
title: Research Review
mode: gateway
depends_on:
  - 02-research
review:
  artifact: docs/product/research/RESEARCH_REPORT.md
  format: md
  prompt: Approve the research package before epic decomposition begins.
---
```

The `review:` block is intentionally narrow:

- `artifact` points at the file or document bundle the human should inspect.
- `format` selects `md` or `html`.
- `prompt` is the short instruction shown in the review surface.
- `skill` optionally points at the HTML-review skill when `format: html`.
- the decision vocabulary stays fixed: `approve`, `revise`, `reject`.

The gateway itself remains bodyless and output-free. The human review is the only extra state.

### Product-design example placement

`examples/product-design` should adopt the pattern at the natural phase boundaries already described in the playbook:

- `02-research-review` between `02-research` and `03-epics`
- `05-design-system-review` between `05-design-system` and `06-views`
- `07-wire-prototype-review` between `07-wire-prototype` and `08-package`

That gives the example explicit human checkpoints after the research package, after the system-wide design decisions, and after the interactive prototype is wired. It keeps the example readable while making the approval points first-class instead of implied.

## Implementation Details

The runtime work falls into three layers.

### 1. TASK.md frontmatter

Add a `review:` block to the task contract, but only for `mode: gateway` in v1.

The parser should reject `review:` on non-gateway tasks so the contract stays small and unsurprising. This keeps the feature aligned with the current mode model: the gateway is the synchronization primitive, and the review block just gives the sync point a human decision surface.

### 2. Runtime gating

When a gateway carries `review:`, the executor should treat the task as pending until a persisted human decision marks it approved.

The runtime should:

- surface the artifact path in the browser review UI
- persist the decision in the same review journal used by the studio today
- unblock downstream tasks only after the latest decision is `approve`
- keep the gate open on `revise`
- mark the gate blocked on `reject`

This is deliberately orthogonal to deterministic `checks:`. Checks still define what "done" means for the producing phase; the review gate decides whether the next phase may begin (`docs/concepts/deterministic-checks.md:8-18`, `docs/concepts/playbook.md:103-110`).

### 3. Browser studio reuse

The existing browser studio already exposes the right review decisions and stores them durably (`packages/studio/src/add-ui.ts:39-55`, `packages/studio/src/add-ui.ts:1584-1657`). The new work should reuse that path instead of inventing a second approval UI.

The implementation should keep the current `HumanReviewEntry` shape and review journal layout, then teach the runtime to read that journal as a gate state for the relevant gateway task. That avoids a parallel approval store and keeps review history inspectable with the same local tooling.

## Backwards Compatibility

This is additive.

- Existing playbooks without `review:` continue to behave exactly as they do today.
- Existing `gateway` tasks remain plain sync points.
- No existing mode changes shape.
- No `playbook.yml` changes are required.

The only new behavior is that a gateway task can now opt into a human review contract.

## Verification

1. Add a fixture playbook with one review gate between two ordinary phases.
2. Verify `converge run --dry` includes the gateway in the DAG and preserves the dependency edge.
3. Verify a review submission persists to the local review journal and survives restart/resume.
4. Verify `approve` unblocks downstream work, `revise` keeps the gate open, and `reject` blocks progression with a visible reason.
5. Verify `examples/product-design` can express its three natural checkpoints without changing the deterministic checks that already define each phase's outputs.

## Why now

The framework already has the two pieces this needs: a structural sync point (`gateway`) and a local browser review surface (`packages/studio/src/add-ui.ts:39-55`, `packages/studio/src/add-ui.ts:1264-1770`). The missing piece is the contract that binds them together.

`examples/product-design` makes the gap obvious because its phases are already organized around review-worthy artifacts: research docs, design system artifacts, and a clickable prototype (`examples/product-design/README.md:29-35`, `examples/product-design/.converge/playbooks/default/tasks/04-features/TASK.md:107-116`, `examples/product-design/.converge/playbooks/default/tasks/06-views/TASK.md:194-215`, `examples/product-design/.converge/playbooks/default/tasks/08-package/TASK.md:51-80`). A first-class review gate lets those boundaries become explicit, durable, and reusable instead of being handled informally.
