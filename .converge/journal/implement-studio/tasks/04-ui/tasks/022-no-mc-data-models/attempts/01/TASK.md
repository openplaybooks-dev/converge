# Task: 04-ui/022-no-mc-data-models

Codify the negative gate: every Mission Control data-model leak is a check failure.

This task is intentionally check-only — its work is done by 019/020/021. The task exists to make the gate explicit and catch regressions: if a future task adds `fleet`, `gateway`, `LaunchSequence`, etc., back into the tree, this check will fail.

**If any check fails on first run, the issue is one of:**
- 019-purge-mc-surface left some files behind. Re-inspect `find packages/converge-studio/src -name '*gateway*' -o -name '*openclaw*' -o -name '*fleet*'`.
- 020-converge-shell didn't update `messages/en.json` (or other locales) — Mission Control strings still in the catalog.
- A converge-native file imports an MC type. Resolve by replacing with the converge equivalent or removing.

**No code to write.** The task body is informational. Just run the checks.