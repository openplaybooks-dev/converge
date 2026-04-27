# FEEDBACK.md — Missing Outputs

**Task**: Slim app shell, converge branding, minimal nav
**Status**: ❌ 1/2 declared output(s) not found on disk

## Outputs

- ✅ `packages/converge-studio/src/app/layout.tsx`
- ❌ `packages/converge-studio/src/components/layout/site-header.tsx`

## ❌ Missing: `packages/converge-studio/src/components/layout/site-header.tsx`

Files present in `packages/converge-studio/src/components/layout/` (up to 20):

```
converge-header.tsx
```

## How to fix

Pick ONE of these, based on what you find above:

1. **If the file truly is missing** — create it per TASK.md instructions.
2. **If a sibling file satisfies the same purpose** (e.g. `.ts` variant of a declared `.js` output) — update the outputs list in the source TASK.md to match what actually exists:
   - Edit `.converge/playbooks/implement-studio/tasks/04-ui/tasks/010-shell-and-branding`
   - Replace the missing output path with the actual filename on disk.
   - Do NOT change the task body — only the frontmatter `outputs:` list.
3. **If the file should exist under a different name** — rename the on-disk file to match the declared output.

After fixing, the verifier will re-check. Every declared output must exist on disk.