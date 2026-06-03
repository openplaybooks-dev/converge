# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Breaking

- **RFC 0034**: Ban `depends_on` from TASK.md frontmatter. Tasks at the same directory level are now auto-chained alphabetically by ID. Migration: `converge migrate --rfc=0034`.
- Renamed the default task mode `leaf` → `task`. The `mode:` enum is now `task | spawner | converger | gateway`, the post-body error codes are `task-spawned` / `task-has-children`, and the exported guard `isLeafDefinition()` is now `isPlainTask()`. The planner's PLAN.md `kind: leaf` is likewise `kind: task`. Both parsers accept the legacy `leaf` value as a deprecated alias, so existing TASK.md / PLAN.md files keep working.
- **RFC 0048 (Two-Layer AI Context Runtime)**: prompts are now built from a curated `AIContextPacket` (objective / procedure / context / constraints / verification / skillRefs) chosen by a fixed-situation classifier (first-run, retry-missing-output, retry-check-failed, blocked-input, producer-rerun, interrupted-resume, human-review-revision, definition-repair). The compact `attempt.json` (`TaskAttemptContext`) is the per-attempt source of truth — the only machine surface the agent prompt ever consults. The internal `AttemptRecord` type was renamed to `TaskAttemptContext` to avoid collision with the existing repair-strategy `AttemptRecord`. `LEARN.md` / `FEEDBACK.md` / `INTERRUPTED.md` / `CHECK.result.md` / `TASK.result.md` are no longer written; their state lives in `attempt.json` (status + retry hints). NEEDS.md / NEEDS.result.md / TASK.md / CHECK.md and the task-level README.md are kept as **derived views** — written by default (`writeMarkdown: true`) for human inspection and crash recovery, but never read by the agent prompt. `PromptBuilder.buildFileBasedTaskRunPrompt` and `PromptBuilder.buildFilesystemBasedRepairPrompt` were removed; `PromptBuilder.buildPacketBasedTaskRunPrompt(packet, attemptNumber)` is the replacement. The repair-prompt path is now free of stale `executions/<runId>/tasks/<taskId>/` references and contradictory "read the journal" rules.

### Changed

- Renamed project from "harness" to "Converge"
- **Single folder loader (clean break).** Removed the legacy `declarative-loader.ts` (`buildDagFromPlaybook`). All folder playbooks now build their DAG through the unified inventory (`declarative-loader-unified.ts`, RFC 0031). A new `bootstrapInventoryFromDisk` creates `tasks.jsonl` from the `tasks/` folder when it's missing (e.g. a fresh clone or after a clean), so the unified path is the only folder path — no more silent fallback to a loader that dropped fields. The unified loader now auto-chains top-level static tasks alphabetically (RFC 0034) at load time rather than trusting stored `depends_on`, and `resolveTaskFromRow` spreads the full TASK.md mapping instead of hand-picking fields (the drift that dropped `handoff`/`mode`/`spawn`). CLI `compile`/`list` and the public API export `buildDagFromInventory` in place of `buildDagFromPlaybook`.
- **RFC 0049 Phases B/C/D — DAG is now a pure inventory projection; one completion rule; the diverge/converge split is gone.** The inventory (`tasks.jsonl`) is the single source of truth: the loader reads rows, the DAG derives hierarchy from each row's `parent`, and the runtime no longer scans `tasks/`. Concrete changes: `DagNode` carries a `parent` field; `TaskDag` exposes `childrenOf(id)` (inventory-derived children) and `registerSpawnedChild(parentId, childId)` (runtime-spawn wire-up); `addNode` no longer pushes reverse-edges into `children` (the polymorphic conflation that bit the 0-child spawner); `getReady` uses one rule — a dep with children blocks downstream until all are terminal, regardless of whether they're static-nested or runtime-spawned; `splitContainerNodes` is deleted; `_hasStaticSubtasks` is gone (children are an inventory fact); the run-loop completion check uses `dag.childrenOf(taskId).length > 0` to decide between `seeded` and `complete`. The on-disk `UnifiedRuntimeTask.parent` schema is unchanged. The synthetic `root-diverge` / `root-converge` bookend nodes stay (they are pure `depends_on` edges and never appear in `childrenOf`).

### Fixed

- **RFC 0047**: a task with a `handoff:` block whose review artifact was deleted (while its `outputs:` deliverable survived) was wrongly treated as cached and skipped, so the report was never regenerated — the symptom seen in `examples/hello-world-review`. The scheduler cache/skip checks and the inventory-ledger hydration only tested `outputs:`; `handoff.artifact` was folded into existence checks solely in the runtime gap detector. A shared `cacheOutputs()` helper now folds the non-gateway `handoff.artifact` into every cache-validity check (and `find-gaps` reuses it), so a missing review artifact resets the task and drives a re-run.
- **Handoff/`mode`/`spawn` dropped by the folder loader.** The legacy and unified folder loaders hand-picked task fields and silently dropped `handoff` (no review artifact enforced), `mode`, and the `spawn` config (`parseTaskMdString` omitted `spawn`). With the unified loader now the sole path, these are carried through, so `handoff` review artifacts are enforced and `mode: spawner` tasks run as spawners.
- **0-child spawner re-queued forever.** A `mode: spawner` task that spawned zero children was marked `seeded` (held open) because the completion check counted DAG downstream dependents (e.g. an injected `root-converge`) as subtask children. It now checks the `_hasStaticSubtasks` flag, so a 0-child spawner completes instead of looping.
- **Human-review pause latency.** The run loop slept the full stall backoff (default 30s) before handing a human-review block back to the verdict poller. It now breaks immediately when a task is blocked on a human verdict, so `converge review` is picked up without the backoff delay.

### Added

- **RFC 0047**: `handoff.generate` now drives AI generation of the human-review report. A task's body does the main work; its `handoff:` block instructs the agent to generate the review artifact (injected into the task prompt), and the artifact's existence is enforced via the standard output-gap/retry path. `converge run --stub` now honors the review gate, so a stubbed task can be driven through approve/reject without a live AI. A single `evaluateReviewGate()` helper backs the task, gateway, and stub gates.
- `converge add --ui` browser studio for interactive planning and local playbook publishing
- Browser studio moved into `@openplaybooks/converge-studio` so the UI can evolve independently from the CLI
- Standardization playbook for project branding and documentation
- Comprehensive documentation including contributing guide, security policy, and ADRs
- Project banner and branding assets
- Root and core package README files

## [0.1.0] - Initial Release

### Added

- Monorepo structure with core, agentfn, codets, and kimifn packages
- Agent function runtime and skill system
- Goal evaluation and convergence engine
- Checkpoint and cursor-based execution model
- Task definition and WBS path resolution
- Plugin system with built-in git plugin
- CLI with run and inspect commands
- Journal-based session and progress tracking
- Filesystem-backed storage layer
