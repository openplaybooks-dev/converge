# Prioritization — Epoch 1

## Picked Improvement

- **Source:** dx
- **Area:** Documentation — troubleshooting and debugging guide
- **Description:** Add a troubleshooting guide that explains where to find execution logs, how to read FEEDBACK.md/LEARN.md from failed attempts, how to reset and re-run tasks, how to manually run check commands, and common failure patterns. This is a missing document that leaves human developers without guidance when they need to intervene in a failed run.
- **Rationale:** This is the highest-impact, lowest-effort improvement available. It requires no code changes — only adding a markdown document. It is completely self-contained with zero risk of cascading breakage. The DX report identified this as the single biggest gap: the framework handles AI self-correction well, but human developers have no guide for debugging failures. Every other candidate either requires significant code changes (type errors, test failures, architecture refactoring) or is a large multi-file effort. A troubleshooting guide directly improves the experience for every new and existing user.

## Runner-up Candidates

### candidate-1
- **Source:** health
- **Description:** Fix 13 type errors across 5 files in core (metrics, repair modules)
- **Skipped:** Moderate effort — touches 5 files across repair and metrics modules, some errors involve type system design decisions (e.g., `AIConfig | AIMultiProviderConfig` mismatch). Not as self-contained as documentation; fixing type errors in repair modules may require understanding the repair subsystem's intended type contracts.

### candidate-2
- **Source:** architecture
- **Description:** Create a "porcelain" API layer — a simplified surface covering 80% of use cases with 3-4 concepts, while the full 100+ export API remains for power users
- **Skipped:** High impact but very high effort. Designing a simplified API requires understanding all current usage patterns, making naming decisions, and ensuring backward compatibility. This is a multi-file, multi-session effort — not suitable for a single task.

### candidate-3
- **Source:** health
- **Description:** Fix 106 failing tests across core, claudefn, agentfn, and qwenfn packages
- **Skipped:** High effort — 106 failures across 4 packages. Likely involves multiple root causes requiring investigation. Not self-contained; test fixes may cascade into code changes.
