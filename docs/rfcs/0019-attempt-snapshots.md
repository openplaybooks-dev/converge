# RFC 0019: Per-attempt snapshot bundles

**Status**: Draft
**Backwards-compatible**: Yes (additive)
**Estimate**: 3-4 days

## Problem

Today, when a task fails, its forensic trail is scattered across 8+ files under `.converge/journal/<playbook>/tasks/<id>/attempts/<n>/`:

- TASK.md, CHECK.md, NEEDS.md, FEEDBACK.md, LEARN.md
- logs/*.log
- data/ subdirectory

To share a failure with a teammate, you tar up the directory. To replay it on a different machine, you need to also bring the inputs (which are elsewhere on disk).

## Proposal

At attempt-end, emit a single `snapshot.tar.gz` containing everything needed to reproduce that attempt:

```
snapshot.tar.gz
├── TASK.md
├── inputs/                 # actual file copies of declared inputs
│   ├── .stitch/screens.json
│   └── ...
├── outputs/                # actual files produced (or pointers if too large)
├── tool-calls.jsonl        # ordered tool calls + results
├── ai-prompts.jsonl        # prompts sent to the provider
├── ai-responses.jsonl      # provider responses
├── env.json                # captured env (with secrets redacted)
└── metadata.json           # attempt number, outcome, costUsd, durationMs
```

Now a failed task is a self-contained replay bundle. Drop it into `converge replay <snapshot.tar.gz>` (or share with a teammate).

## Code-level design

- Hook into the attempt-end handler.
- Snapshot writer in `packages/core/src/journal/snapshot.ts`.
- Secrets-redaction list (configurable in project.yml).
- `converge replay <bundle>` subcommand.

### Size limits

For tasks with massive outputs (multi-MB), don't embed; use a pointer to the original journal location:

```json
{ "kind": "ref", "path": ".converge/journal/.../outputs/big-file.bin", "sha256": "..." }
```

## Implementation steps

1. Define the bundle layout.
2. Writer.
3. Replay subcommand.
4. Documentation.

## Test plan

1. Failed task → snapshot.tar.gz produced under attempt dir.
2. Replay on a fresh checkout → reproduces the attempt deterministically (modulo non-determinism in LLM).
3. Large output → pointer used instead of embed.
4. Secret in env → redacted in snapshot.

## Out of scope

- Cross-attempt diffing (could come later).
- Anonymization (a separate "share publicly" pipeline that strips PII).
