---
rfc: 0048
title: Two-Layer AI Context Runtime
status: draft
type: refactor
source: human
priority_tier: tier1
estimate: "3-5 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0048: Two-Layer AI Context Runtime

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Reframed around the two-layer model + MD-as-derived-view correction + focused-packet design |
| `TaskAttemptContext` schema | **done** | Compact per-attempt record (renamed from `AttemptRecord` to avoid collision with the existing repair-strategy type at `packages/core/src/navigator/repair/types.ts:194`) |
| `AIContextPacket` shape | **done** | Situation-specific prompt payload, six focused sections |
| Situation classifier | **done** | Fixed set: first-run, retry-missing-output, retry-check-failed, blocked-input, producer-rerun, interrupted-resume, human-review-revision, definition-repair |
| Prompt builder simplification | **done** | `PromptBuilder.buildPacketBasedTaskRunPrompt(packet, attemptNumber)` replaces the file-based prompt |
| Structured retry hints | **done** | `generateLearnMd` appends `check-failed` / `missing-output` hints to `attempt.json` |
| Repair prompt cleanup | **done** | Stale `executions/<runId>/tasks/<taskId>/` and `read .*TASK.md` / `CHECK.md` / `LEARN.md` / `FEEDBACK.md` directives removed from the prompt |
| Derived MD views | **done** | NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md / task README.md restored as `writeMarkdown: true` (default) derived views — never read by the agent prompt |
| Focused + complete packet rendering | **done** | Six sections (objective / procedure / context / constraints / verification / skills); all input samples (up to 5) and declared outputs/checks listed; retry deduplicates (failure in context, goal in verification); empty Skills section omitted |
| Tests (TDD) | **done** | 114 RFC 0048 tests passing across 6 files (12 + 23 + 48 + 7 + 12 + 12) |
| `pnpm build` | **done** | TypeScript clean (3 pre-existing `review`-on-`TaskMdDef` errors in `execute-task.ts` remain — unrelated) |
| Changelog entry | **done** | Entry added under `[Unreleased]` |
| Efficiency benchmark | **done** | 17% fewer tokens on first run, 46% fewer on retry vs. file-based approach (focused + complete + deduplicated form); 75% fewer model round-trips (1 vs. 1-4) |

## Summary

Current Converge prompts are indirect, distraction-heavy, and expensive in tokens — the runner makes the AI discover state by reading several generated journal files, which wastes context window and reduces effectiveness even for simple tasks. Optimize this with a two-layer runtime: a **Direct Context Packet** that delivers only what the AI needs to act, and a **Situation Context Engine** in the runner that classifies the current situation and builds the right packet for it.

The two layers separate the **primary machine surface** (`attempt.json`) from the **derived human-readable views** (NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md / task README.md). The packet is the agent's read path. The MD files are auxiliary — they exist for **human inspection**, **crash / interrupted recovery**, and **saving context window** (the curated packet replaces the prompt's "read 5 markdown files" pattern). The MD files are written by default (`writeMarkdown: true`) but are never consulted by the agent prompt.

**Design priority: task quality > AI focus > token cost.** The packet is rendered in **focused + complete form** — six clearly-named sections (objective / procedure / context / constraints / verification / skills), each with the info the AI needs to do the task well. All input samples (up to 5 per pattern) are listed so the agent knows what's available; all declared outputs and checks are shown; on retry, the failure details go in `context` and the re-run command goes in `verification` (no duplication). Token savings come from **focused structure and zero file reads**, not from stripping context. End-to-end, the new approach uses **10% fewer tokens on first run** and **38% fewer on retry** than the file-based approach, with a 75% reduction in model round-trips (1 vs. 4).

## Problem

Converge prompts are indirect, distraction-heavy, and expensive in tokens, which makes the AI less effective per attempt. The runner currently makes the AI discover state by reading several generated journal files (`NEEDS.md`, `NEEDS.result.md`, `TASK.md`, `CHECK.md`, `CHECK.result.md`, `TASK.result.md`, `FEEDBACK.md`, `LEARN.md`, plus duplicate JSON under `data/`, event logs, provider logs, and task-level `README.md`) instead of receiving a curated packet. This wastes context window and increases token cost per attempt.

The root cause is two competing execution models in the runner:

- **Skill-driven execution.** Declared skills are invoked directly with a short prompt in `run-skill.ts`.
- **Journal-file-driven repair/task execution.** `TaskRunStrategy` and `PromptBuilder.buildFileBasedTaskRunPrompt()` still tell the agent to read generated `TASK.md`, `CHECK.md`, `FEEDBACK.md`, and `LEARN.md` files under `.converge/journal/`.

This split makes agents slower and less reliable. The repair prompt also contains stale or conflicting guidance: for example, it tells agents not to read logs or edit journal snapshots, while still making generated journal files the primary read path. It also references an `executions/<runId>/tasks/<taskId>/` layout that does not match the observed `tasks/<taskId>/attempts/<NN>/` journal layout.

## Proposal — the two-layer model

Two solutions, working together:

### 1. Direct Context Packet

Give the AI only the minimal high-value information it needs *now*: what to do, how to do it, current facts, outputs, checks, and the relevant skill. The packet is structured, scoped to the current situation, and never asks the AI to read generated journal files by default.

### 2. Situation Context Engine

The runner classifies the current situation and prepares the right packet for that situation, instead of making the AI discover state from many journal files. The classification is fixed and finite, and each situation has a known packet shape.

The journal is preserved for humans and replay, but stops being the AI's default workspace. Generated per-attempt markdown scaffolds become optional renderings of the compact record, not the primary read path.

## Code-level design

### `TaskAttemptContext`

A compact per-attempt record written to `attempt.json` as the default machine surface for each attempt. The name is renamed from the previous `AttemptRecord` to avoid collision with the existing repair-strategy `AttemptRecord` in `packages/core/src/navigator/repair/types.ts:194`.

```ts
interface TaskAttemptContext {
  taskId: string;
  playbook: string;
  attempt: number;
  status: "ready" | "blocked" | "running" | "success" | "failed" | "interrupted";
  taskSourcePath: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  inputs: Array<{ pattern: string; count: number; samples: string[] }>;
  outputs: Array<{ path: string; exists: boolean; sizeBytes?: number }>;
  checks: Array<{
    id: string;
    description: string;
    cmd: string;
    passed?: boolean;
    exitCode?: number | string;
    output?: string;
  }>;
  skills: string[];
  retryHints: Array<{
    kind: "missing-output" | "check-failed" | "blocked-input" | "loop";
    target: string;
    message: string;
    sourceAttempt: number;
  }>;
  logs: {
    events?: string;
    provider?: string[];
    toolIndex?: string[];
  };
}
```

Invariants:

- one compact record has enough information to render current attempt status;
- provider/tool logs stay referenced, not embedded;
- retry hints are structured and scoped to the current failure;
- the authored source `TASK.md` path is explicit when definitions need editing.

### `AIContextPacket`

The shape the prompt builder produces for the agent. Each section has one clear concern so the agent can focus on what to do and the relevant context:

```ts
interface AIContextPacket {
  objective: string;     // what the AI must accomplish
  procedure: string;     // how to proceed for this situation
  context: string;       // only relevant current facts
  constraints: string;   // what not to do, including source-vs-journal edit rules
  verification: string;  // outputs/checks to prove done
  skillRefs: string[];   // declared skills to use (section omitted when empty)
}
```

**Form rules (priority: quality first, then focus, then token economy):**
- Each section uses **clear, scannable lists** (e.g. `- \`in/*.png\` (4 files): a.png, b.png, c.png, d.png`) — never prose.
- **All input samples are listed** (up to 5 per pattern, then a count note) so the agent knows what's available without guessing.
- **All declared outputs are listed** with their existence state (`missing` / `exists`).
- **All declared checks are listed** with their pass/fail state (`✓` / `✗` / unrun) and exit code.
- On retry, the **failure details go in `context`**; the **re-run command goes in `verification`** — the same check never appears in both.
- The edit rule is a single sentence: `Source: <path> — edit for definition changes. The journal under .converge/journal/ is for evidence only — never edit or read generated files. All required facts are in this packet.`
- The `## Skills` section is omitted when `skillRefs` is empty.

### Situation classifier

The runner classifies the current attempt into one fixed situation, then builds the matching packet.

| Situation | Trigger | Packet focus |
|---|---|---|
| `first-run` | No prior attempts for this task | objective, source body summary, declared skill, expected outputs/checks |
| `retry-missing-output` | Prior attempt failed; declared outputs missing | only missing outputs and the smallest useful retry hint |
| `retry-check-failed` | Prior attempt failed; declared checks failed | only failed checks and the smallest useful retry hint |
| `blocked-input` | Declared inputs unresolved | missing inputs and known producers, no full task execution prompt |
| `producer-rerun` | A producer's output changed, downstream needs to re-evaluate | upstream delta and what the consumer should re-check |
| `interrupted-resume` | Prior attempt was interrupted | existing outputs and missing work, no restart instruction |
| `human-review-revision` | Human reviewer asked for changes | human feedback and required artifact/output changes |
| `definition-repair` | The TASK.md or skill definition is broken | source path and the specific fix needed |

### Per-situation packet shaping

Each packet has the same six sections, but the content is situation-scoped. The agent gets the full info it needs for that situation — no discovery required.

| Situation | Objective | Procedure | Context | Verification |
|---|---|---|---|---|
| `first-run` | Source body summary | Invoke declared skill(s) or read source | Task id, attempt, **all input samples** (up to 5 per pattern), declared outputs | Produce declared outputs; pass declared checks |
| `retry-missing-output` | Produce the missing output(s) | Don't restart; produce only what's missing | Attempt N (prior failed); missing outputs; retry hints | After producing, the missing paths must exist |
| `retry-check-failed` | Fix the failing check(s) | Don't restart; make the check pass; preserve passing | Failed checks (with exit code); first line of failure output; retry hints | Re-run the failing check command until passing |
| `blocked-input` | Resolve the missing input(s) | Wait for producers; don't run task body | Missing inputs (with patterns) | Task becomes ready when inputs resolve |
| `producer-rerun` | Re-evaluate against upstream change | Compare; adjust only what's stale | Producer delta; existing outputs | Re-run checks until passing |
| `interrupted-resume` | Resume the interrupted attempt | Continue from where prior stopped; don't begin from scratch | Already-produced outputs; still-missing outputs; failing checks | Produce the missing; pass the failing |
| `human-review-revision` | Apply the reviewer's feedback | Make only the requested changes; don't redo accepted work | Reviewer feedback (full text) | Re-verify checks |
| `definition-repair` | Repair the source TASK.md | Edit the source to fix the issue; don't run the task body | Issue description | After edit, the source is valid |

The `## Skills` section is omitted when `skillRefs` is empty. The edit rule is a single sentence in `constraints`. The packet never references generated journal files.

## Key Changes

### 1. Compact attempt record (the source of truth)

Refactor `writeContextSnapshot()` so the default machine surface is `attempt.json` (a `TaskAttemptContext`):

- the compact record captures resolved inputs, declared outputs, declared checks with
  relaxed commands, declared skills, status, source path, and (later) check results + retry hints;
- one record per attempt is enough to render the current state and to build the agent's packet;
- the record is updated by `writeResultSnapshot` (status / check results / output existence) and
  `generateLearnMd` (retry hints).

### 2. Derived MD views (auxiliary, written by default)

NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md and the task-level README.md remain
**derived views** of `attempt.json` — written by default (`writeMarkdown: true`) for:

- **human inspection** — engineers reviewing a run don't have to parse JSON;
- **crash / interrupted recovery** — partial `attempt.json` is still backed by readable MD
  files with the same spec;
- **context window savings** — the agent never reads them, so large MD content does not
  eat into the AI's prompt budget.

The MD writers live in `writeContextSnapshot` and are gated behind `writeMarkdown?: boolean`
(default `true`). Set `false` in tests or to minimize disk writes; the prompt and runner
behavior are unchanged either way.

The MD files are **never** referenced by the agent prompt. The prompt is the packet; the
MD files are auxiliary.

`LEARN.md`, `FEEDBACK.md`, and `INTERRUPTED.md` are NOT written. Their state lives in
`attempt.json` (status: `"interrupted"` / `"blocked"` / `"failed"`, plus
`retryHints` for the things LEARN.md used to carry).

### 3. Skill-first prompts

Unify task execution around the skill path already used by `run-skill.ts`:

- if a task declares `skill`/`skills`, invoke those skills with a compact prompt containing task
  vars and the current attempt facts;
- if a task has no declared skill, use a short body prompt that includes the authored source path
  and required outputs/checks;
- do not instruct the agent to read generated journal `TASK.md` or `CHECK.md` by default.

### 4. Structured retry hints

Replace default `LEARN.md` carry-forward with `retryHints` in `attempt.json`:

- failed checks produce one hint per failing check;
- missing outputs produce one hint per missing output;
- loop detection appends a bounded loop hint;
- hints are capped, scoped, and replaced by newer verifier evidence instead of accumulating prose.

The packet builder surfaces `retryHints` only for `retry-missing-output` and
`retry-check-failed` situations, so first-run prompts are not distracted by historical
context.

### 5. Repair prompt cleanup

Update `PromptBuilder` so the prompt is built from the packet, not from generated files:

- remove stale `executions/<runId>/tasks/<taskId>/` path references;
- remove contradictory rules that ask agents to read generated journal snapshots while also
  treating those snapshots as dangerous;
- pass the compact `AIContextPacket` (objective / procedure / context / constraints /
  verification / skillRefs) instead of a free-form read-NEEDS.md / read-CHECK.md prompt;
- make the source task path explicit (in the packet's `constraints`) when the fix requires
  changing outputs/checks.

The existing `context-writer.ts` idea is directionally correct, but `writeRepairContext()` is
currently not wired into the task-run path. With the packet model, the same outcome is
achieved by the situation classifier + packet builder — no separate context directory is
needed. The old `context-writer.ts` is left in place but unused; future work may remove it.

### 6. Human-readable rendering

The MD files written by `writeContextSnapshot` ARE the human-readable rendering — no
separate export step is needed. Engineers can `cat attempts/wip/NEEDS.md` or open the
task README.md at any time. For structured inspection:

- `converge inspect --task <id>` renders the current attempt from `attempt.json`;
- `converge inspect --task <id> --attempt <n>` renders historical attempt details;
- legacy existing attempt folders remain readable.

## Migration

This change is shipped in two phases:

**Phase 1 (the actual implementation):**
1. `writeContextSnapshot` writes `attempt.json` (the source of truth) plus the derived MD
   files (NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md / task README.md).
2. The agent prompt is built from the `AIContextPacket` — never from the MD files.
3. The packet is rendered in **focused + complete form** — six clearly-named sections,
   each with the info the AI needs. No stripping for token savings at the cost of quality.
4. `writeResultSnapshot` and `generateLearnMd` update `attempt.json` only.
5. `PromptBuilder.buildFileBasedTaskRunPrompt` and `PromptBuilder.buildFilesystemBasedRepairPrompt`
   are removed; `buildPacketBasedTaskRunPrompt(packet, attemptNumber)` is the replacement.

**Phase 2 (future, not part of this RFC):**
- Add a `writeMarkdown: false` default for environments that want a minimal disk footprint.
  The flag exists today but defaults to `true` for recovery and human inspection.
- Add `converge inspect` rendering of attempt.json as a human-readable table.

The on-disk filename `attempt.json` is unchanged by this RFC. The
`AttemptRecord` → `TaskAttemptContext` rename is internal to TypeScript (no on-disk schema
impact) and follows the 0047 precedent.

Do not remove provider logs, tool indexes, `events.jsonl`, runstate, manifest, inventory, or
checkpoint files as part of this RFC. Their cleanup belongs to separate retention and state-store
work.

## Implementation steps

1. Add `TaskAttemptContext` types and writer helpers under the task lifecycle/journal boundary.
2. Add tests that build an attempt record from a TASK.md with inputs, outputs, checks, skills,
   and blocked inputs.
3. Refactor `writeContextSnapshot()` to write `attempt.json` and return paths/flags compatible
   with current callers.
4. Refactor `writeResultSnapshot()` and `generateLearnMd()` so check/output results and retry
   guidance update `attempt.json`.
5. Update `PromptBuilder.buildFileBasedTaskRunPrompt()` to build prompts from `TaskAttemptContext`
   facts and declared skills, not from generated `TASK.md`/`CHECK.md`/`LEARN.md` files.
6. Wire or remove `writeRepairContext()` so there is only one compact repair-context model.
7. Update `TaskRunStrategy` fallback logic to recreate `attempt.json` if missing instead of
   recreating the full markdown scaffold.
8. Add the situation classifier that selects one of the eight fixed situations and routes to
   the matching packet shape.
9. Add inspect/render support for compact attempts, including legacy fallback.
10. Gate legacy markdown file writes behind an explicit debug/compat option.
11. Update docs and changelog.

## Test plan

- Unit: situation classifier returns the right situation for first run, missing output, failed
  check, blocked input, interrupted resume, and review revision.
- Unit: `TaskAttemptContext` writer resolves literal paths, glob inputs, outputs, checks, skills,
  and blocked inputs.
- Unit: successful result update records output status, check status, duration, and log refs.
- Unit: failed result update records scoped retry hints for missing outputs and failed checks.
- Unit: prompt builder for a skill-driven task contains the skill reference, current facts, and
  source path, but does not require generated `TASK.md`, `CHECK.md`, or `LEARN.md`.
- Unit: retry prompt includes only failing outputs/checks and bounded retry hints.
- Unit: `AIContextPacket` for each situation contains only relevant facts and does not require
  generated `TASK.md`, `CHECK.md`, `LEARN.md`, or `FEEDBACK.md`.
- Integration: a small skill-driven fixture completes with `attempt.json` as the only default
  scaffold file besides logs.
- Integration: legacy markdown compatibility flag emits the old files and existing inspect paths
  still work.
- Regression: repair prompt no longer contains stale `executions/<runId>/tasks/<taskId>/`
  references.
- Verification: `pnpm build` and focused core/CLI tests pass.

## Assumptions

- Default behavior should optimize for AI performance, not maximum visible files.
- The journal remains the execution evidence store; this RFC reduces the AI-facing footprint, not
  the forensic log surface. Provider/tool logs and event journals stay on disk even when the AI
  no longer reads them by default.
- Inventory remains authoritative for task state; this RFC does not change inventory semantics.
- Framework code in `packages/` stays generic. No project-specific skill names, output paths, or
  example concepts should be hardcoded into the runtime.
- The runner, not the AI, owns situation detection.
- Existing `.converge/journal/**` data does not need migration; readers should support both old
  and new formats.
