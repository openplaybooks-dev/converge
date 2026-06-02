---
rfc: 0048
title: Skill-driven compact journal runtime
status: proposed
type: refactor
source: human
priority_tier: tier1
estimate: "3-5 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0048: Skill-driven compact journal runtime

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **done** | Proposed design |
| `AttemptRecord` schema | **pending** | Replace duplicated per-attempt markdown as the default machine surface |
| Prompt builder simplification | **pending** | Default prompts reference compact facts and declared skills |
| Structured retry hints | **pending** | Replace default `LEARN.md` carry-forward |
| Repair prompt cleanup | **pending** | Remove stale paths and conflicting journal instructions |
| Legacy markdown export | **pending** | Keep human/debug rendering without making it the AI default |
| Tests (TDD) | **pending** | Attempt record, prompt, retry, and compatibility coverage |
| `pnpm build` | **pending** | TypeScript + DTS clean |
| Changelog entry | **pending** | Add under `[Unreleased]` |

## Problem

Converge currently gives AI agents too much generated context for each task. A typical attempt
can contain `NEEDS.md`, `NEEDS.result.md`, `TASK.md`, `CHECK.md`, `CHECK.result.md`,
`TASK.result.md`, `FEEDBACK.md`, `LEARN.md`, duplicate JSON under `data/`, event logs, provider
logs, and task-level `README.md`. The markdown files are small on disk, but they create a large
attention surface: many files look authoritative, many repeat the same contract, and some are
read-only generated snapshots while others point the agent back to source `TASK.md`.

The current code has two competing execution models:

- **Skill-driven execution.** Declared skills are invoked directly with a short prompt in
  `run-skill.ts`.
- **Journal-file-driven repair/task execution.** `TaskRunStrategy` and
  `PromptBuilder.buildFileBasedTaskRunPrompt()` still tell the agent to read generated
  `TASK.md`, `CHECK.md`, `FEEDBACK.md`, and `LEARN.md` files under `.converge/journal/`.

This split makes agents slower and less reliable. The repair prompt also contains stale or
conflicting guidance: for example, it tells agents not to read logs or edit journal snapshots,
while still making generated journal files the primary read path. It also references an
`executions/<runId>/tasks/<taskId>/` layout that does not match the observed
`tasks/<taskId>/attempts/<NN>/` journal layout.

The expensive disk footprint mostly comes from provider/tool logs, which are still useful for
forensics. The AI confusion comes from duplicated generated prompt scaffolding.

## Proposal

Make the default AI-facing runtime skill-driven and compact:

- `TASK.md` remains the authored source of truth for the task contract: objective/body, inputs,
  outputs, checks, review/handoff, vars, and declared `skill`/`skills`.
- The default agent prompt contains only the current task objective, resolved vars, relevant
  inputs, required outputs, current failing checks, and declared skill references.
- Generated per-attempt markdown scaffolds stop being the default agent read path.
- The journal keeps detailed logs for humans and replay, but they become forensic artifacts, not
  primary prompt context.

Introduce a compact `AttemptRecord` as the default per-attempt machine surface:

```ts
interface AttemptRecord {
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

The exact schema can evolve during implementation, but it must preserve these invariants:

- one compact record has enough information to render current attempt status;
- provider/tool logs stay referenced, not embedded;
- retry hints are structured and scoped to the current failure;
- the authored source `TASK.md` path is explicit when definitions need editing.

## Key Changes

### 1. Compact attempt records

Refactor `writeContextSnapshot()` so the default output is `attempt.json` plus log directories.
The record replaces the default need/check/task markdown copies:

- `data/needs.json` and `data/check.json` collapse into `attempt.json`;
- `NEEDS.md`, `NEEDS.result.md`, `CHECK.md`, copied `TASK.md`, and task-level `README.md` are
  legacy/debug renderings, not required runtime files;
- `CHECK.result.md`, `TASK.result.md`, and `FEEDBACK.md` become rendered views derived from
  structured check/output/session data when explicitly requested.

### 2. Skill-first prompts

Unify task execution around the skill path already used by `run-skill.ts`:

- if a task declares `skill`/`skills`, invoke those skills with a compact prompt containing task
  vars and the current attempt facts;
- if a task has no declared skill, use a short body prompt that includes the authored source path
  and required outputs/checks;
- do not instruct the agent to read generated journal `TASK.md` or `CHECK.md` by default.

### 3. Structured retry hints

Replace default `LEARN.md` carry-forward with `retryHints` in `attempt.json`:

- failed checks produce one hint per failing check;
- missing outputs produce one hint per missing output;
- loop detection appends a bounded loop hint;
- hints are capped, scoped, and replaced by newer verifier evidence instead of accumulating prose.

`LEARN.md` may remain as a legacy export/debug view for one compatibility window, but the runner
should not require agents to read or write it in the default path.

### 4. Repair prompt cleanup

Update `PromptBuilder.buildFileBasedTaskRunPrompt()` and related repair prompts:

- remove stale `executions/<runId>/tasks/<taskId>/` path references;
- remove contradictory rules that ask agents to read generated journal snapshots while also
  treating those snapshots as dangerous;
- pass compact attempt facts directly, or point to a compact context directory derived from
  `attempt.json`;
- make the source task path explicit when the fix requires changing outputs/checks.

The existing `context-writer.ts` idea is directionally correct, but `writeRepairContext()` is
currently not wired into the task-run path. Implementation should either export and use it, or
replace it with the new `AttemptRecord` renderer. Do not keep a second unused context model.

### 5. Human-readable rendering

Move markdown generation behind explicit render/export surfaces:

- `converge inspect --task <id>` renders the current attempt from `attempt.json`;
- `converge inspect --task <id> --attempt <n>` renders historical attempt details;
- optional `converge inspect --export-markdown` can write the old-style markdown bundle for
  sharing/debugging;
- legacy existing attempt folders remain readable.

## Migration

This change is backward compatible if shipped in phases:

1. Write `attempt.json` alongside the existing markdown files.
2. Update prompt builders and repair strategies to prefer `attempt.json`.
3. Update `inspect` to render both old markdown attempts and new compact attempts.
4. Add a temporary compatibility flag, for example `CONVERGE_LEGACY_ATTEMPT_MARKDOWN=1`, that
   writes the old scaffold files.
5. After one compatibility window, stop writing legacy markdown by default while keeping the
   renderer/export path.

Do not remove provider logs, tool indexes, `events.jsonl`, runstate, manifest, inventory, or
checkpoint files as part of this RFC. Their cleanup belongs to separate retention and state-store
work.

## Implementation Plan

1. Add `AttemptRecord` types and writer helpers under the task lifecycle/journal boundary.
2. Add tests that build an attempt record from a TASK.md with inputs, outputs, checks, skills,
   and blocked inputs.
3. Refactor `writeContextSnapshot()` to write `attempt.json` and return paths/flags compatible
   with current callers.
4. Refactor `writeResultSnapshot()` and `generateLearnMd()` so check/output results and retry
   guidance update `attempt.json`.
5. Update `PromptBuilder.buildFileBasedTaskRunPrompt()` to build prompts from attempt facts and
   declared skills, not from generated `TASK.md`/`CHECK.md`/`LEARN.md` files.
6. Wire or remove `writeRepairContext()` so there is only one compact repair-context model.
7. Update `TaskRunStrategy` fallback logic to recreate `attempt.json` if missing instead of
   recreating the full markdown scaffold.
8. Add inspect/render support for compact attempts, including legacy fallback.
9. Gate legacy markdown file writes behind an explicit debug/compat option.
10. Update docs and changelog.

## Test Plan

- Unit: attempt record writer resolves literal paths, glob inputs, outputs, checks, skills, and
  blocked inputs.
- Unit: successful result update records output status, check status, duration, and log refs.
- Unit: failed result update records scoped retry hints for missing outputs and failed checks.
- Unit: prompt builder for a skill-driven task contains the skill reference, current facts, and
  source path, but does not require generated `TASK.md`, `CHECK.md`, or `LEARN.md`.
- Unit: retry prompt includes only failing outputs/checks and bounded retry hints.
- Integration: a small skill-driven fixture completes with `attempt.json` as the only default
  scaffold file besides logs.
- Integration: legacy markdown compatibility flag emits the old files and existing inspect paths
  still work.
- Regression: repair prompt no longer contains stale `executions/<runId>/tasks/<taskId>/`
  references.
- Verification: `pnpm build` and focused core/CLI tests pass.

## Assumptions

- The journal remains the execution evidence store; this RFC reduces the AI-facing footprint, not
  the forensic log surface.
- Inventory remains authoritative for task state; this RFC does not change inventory semantics.
- Framework code in `packages/` stays generic. No project-specific skill names, output paths, or
  example concepts should be hardcoded into the runtime.
- Existing `.converge/journal/**` data does not need migration; readers should support both old
  and new formats.

  # Two-Layer AI Context Runtime

  ## Summary

  Revise RFC 0048 and implement it around two explicit solutions:

  1. Direct Context Packet: give the AI only the minimal high-value information it needs now: what to do, how to do it, current facts, outputs, checks, and relevant skill.
  2. Situation Context Engine: make the runner classify the current situation and prepare the right packet for that situation, instead of making the AI discover state from many journal files.

  This keeps the journal for evidence, but stops treating generated journal folders as the AI’s default workspace.

  ## Key Changes

  - Add a runtime TaskAttemptContext record, not AttemptRecord, to avoid collision with the existing repair-strategy AttemptRecord.
  - Store one compact attempt.json per task attempt with:
      - task id, playbook, source TASK.md path, attempt number, status
      - resolved vars, skills, inputs, outputs, checks
      - current result state and bounded retry hints
      - references to logs, not embedded logs

  - Introduce a prompt-facing AIContextPacket shape:
      - objective: what the AI must accomplish
      - procedure: how to proceed for this situation
      - context: only relevant current facts
      - constraints: what not to do, including source-vs-journal edit rules
      - verification: outputs/checks to prove done
      - skillRefs: declared skills to use

  - Add a situation classifier in the runner with fixed situations:
      - first-run
      - retry-missing-output
      - retry-check-failed
      - blocked-input
      - producer-rerun
      - interrupted-resume
      - human-review-revision
      - definition-repair

  - For each situation, the runner builds a different packet:
      - first run: task objective, source body summary, declared skill, expected outputs/checks
      - retry: only failed outputs/checks and the smallest useful retry hint
      - blocked input: missing inputs and known producers, no full task execution prompt
      - interrupted resume: existing outputs and missing work, no restart instruction
      - review revision: human feedback and required artifact/output changes

  - Keep markdown files as optional rendered/debug views, not the default agent input:
      - NEEDS.md, CHECK.md, FEEDBACK.md, LEARN.md, copied TASK.md, and task README.md become legacy/export artifacts
      - converge inspect renders human-readable views from attempt.json
      - provider logs and events.jsonl remain forensic artifacts

  ## Implementation Plan

  - RFC update:
      - update docs/rfcs/0048-skill-driven-compact-journal-runtime.md to present the two-layer model directly
      - rename proposed schema from AttemptRecord to TaskAttemptContext
      - add the AIContextPacket and situation classifier concepts

  - Runtime context:
      - add TaskAttemptContext types and read/write helpers under task lifecycle or journal code
      - refactor writeContextSnapshot() to write attempt.json and return compatible path/status data
      - keep legacy markdown writing behind a compatibility flag

  - Prompt builder:
      - replace PromptBuilder.buildFileBasedTaskRunPrompt()’s generated-file read path with situation-specific packet formatting
      - remove stale journal path references
      - remove instructions that ask the AI to inspect generated journal files by default

  - Retry and repair:
      - convert generateLearnMd(), loop hints, dependency backoff hints, and feedback writer outputs into structured retry hints in attempt.json
      - keep LEARN.md/FEEDBACK.md as rendered compatibility output only
      - either wire context-writer.ts into this packet model or remove it as unused duplicate context machinery

  - Inspect/render:
      - update inspect paths to render compact attempts
      - support legacy attempt folders when attempt.json is absent

  ## Test Plan

  - Unit: situation classifier returns the right situation for first run, missing output, failed check, blocked input, interrupted resume, and review revision.
  - Unit: TaskAttemptContext writer records inputs, outputs, checks, skills, source path, status, and log refs.
  - Unit: AIContextPacket for each situation contains only relevant facts and does not require generated TASK.md, CHECK.md, LEARN.md, or FEEDBACK.md.
  - Unit: retry hints are bounded and replaced by current verifier evidence.
  - Regression: prompt output contains no stale executions/<runId>/tasks/<taskId> journal path.
  - Integration: skill-driven fixture completes using compact packet and attempt.json.
  - Compatibility: legacy markdown flag still emits old scaffold files.
  - Verification: pnpm build and focused core/CLI tests pass.

  ## Assumptions

  - Default behavior should optimize for AI performance, not maximum visible files.
  - The runner, not the AI, owns situation detection.
  - Journal data remains available for humans and debugging, but the AI receives a curated packet.
  - No project-specific skills, paths, or examples are hardcoded into packages/.