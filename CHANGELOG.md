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
