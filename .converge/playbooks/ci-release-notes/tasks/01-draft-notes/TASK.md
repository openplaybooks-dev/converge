---
id: 01-draft-notes
title: Draft release notes from commits since the previous tag

inputs:
  - ".converge/inputs/commit-msgs.txt"
  - ".converge/inputs/changed-files.txt"
  - ".converge/inputs/prev-tag.txt"
  - ".converge/inputs/new-tag.txt"

outputs:
  - ".converge/playbooks/ci-release-notes/output/release-notes.md"

checks:
  - id: notes-exist
    cmd: "test -s .converge/playbooks/ci-release-notes/output/release-notes.md"
    description: release-notes.md exists
  - id: header-present
    cmd: "grep -q \"^## What's Changed in\" .converge/playbooks/ci-release-notes/output/release-notes.md"
    description: starts with a versioned heading
---

Read:

- `.converge/inputs/commit-msgs.txt` — commits between the previous tag
  and the new tag, one per `---` separator.
- `.converge/inputs/changed-files.txt` — every file changed between the
  two tags.
- `.converge/inputs/prev-tag.txt` and `.converge/inputs/new-tag.txt` —
  the tag strings.

Draft release notes that a release manager can publish with minimal
edits. Group commits by CLAUDE.md type:

- **Features** — `feat`
- **Fixes** — `fix`
- **Performance** — `perf`
- **Reverts** — `revert`
- **Internal** — `refactor`, `test`, `docs`, `chore` (one collapsed group)

Within each group, write one user-readable bullet per commit. Extract
the **why** from the commit body when present; do not just echo the
subject. Mark breaking changes with a leading `**BREAKING:**` tag and
hoist them into a `## Breaking changes` section above the others.

If the commit list is empty, write a single body `No user-facing
changes in <new-tag>.` after the heading.

Output `.converge/playbooks/ci-release-notes/output/release-notes.md`
beginning with:

```
## What's Changed in <new-tag>
```

…where `<new-tag>` comes from `.converge/inputs/new-tag.txt`.
