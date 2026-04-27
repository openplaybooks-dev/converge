# FEEDBACK.md — Missing Outputs

**Task**: Section: FAQ
**Status**: ❌ 1/1 declared output(s) not found on disk

## Outputs

- ❌ `apps/landing/src/components/sections/Faq.astro`

## ❌ Missing: `apps/landing/src/components/sections/Faq.astro`

Files present in `apps/landing/src/components/sections/` (up to 20):

```
FeatureGrid.astro
Hero.astro
InteractiveComparison.astro
ProblemSolution.astro
Quickstart.astro
SocialProof.astro
```

## How to fix

Pick ONE of these, based on what you find above:

1. **If the file truly is missing** — create it per TASK.md instructions.
2. **If a sibling file satisfies the same purpose** (e.g. `.ts` variant of a declared `.js` output) — update the outputs list in the source TASK.md to match what actually exists:
   - Edit `.converge/journal/landing-page/tasks/04-build-sections/tasks/007-faq`
   - Replace the missing output path with the actual filename on disk.
   - Do NOT change the task body — only the frontmatter `outputs:` list.
3. **If the file should exist under a different name** — rename the on-disk file to match the declared output.

After fixing, the verifier will re-check. Every declared output must exist on disk.