# FEEDBACK.md — Missing Outputs

**Task**: Rename harness→converge in TypeScript source
**Status**: ❌ 1/1 declared output(s) not found on disk

## Outputs

- ❌ `.converge/standardize-state/brand/001-source.json`

## ❌ Missing: `.converge/standardize-state/brand/001-source.json`

Parent directory `.converge/standardize-state/brand/` does not exist.

## How to fix

Pick ONE of these, based on what you find above:

1. **If the file truly is missing** — create it per TASK.md instructions.
2. **If a sibling file satisfies the same purpose** (e.g. `.ts` variant of a declared `.js` output) — update the outputs list in the source TASK.md to match what actually exists:
   - Edit `.converge/playbooks/oss-standardize/tasks/01-brand/tasks/001-source-rename`
   - Replace the missing output path with the actual filename on disk.
   - Do NOT change the task body — only the frontmatter `outputs:` list.
3. **If the file should exist under a different name** — rename the on-disk file to match the declared output.

After fixing, the verifier will re-check. Every declared output must exist on disk.