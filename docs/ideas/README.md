# Ideas folder

Drop free-form improvement ideas here as plain markdown files. The
`rfc-ideation` playbook picks one per epoch (weighted round-robin against
GitHub issues, backlog, and code findings), expands it into a full RFC, and
files it under `docs/rfcs/NNNN-<slug>.md` for human review.

## Format

One idea per file. Filename is kebab-case, descriptive:

```
docs/ideas/cache-invalidation-on-template-edit.md
docs/ideas/per-task-output-streaming.md
docs/ideas/parallel-spawn-rate-limiting.md
```

File body is freeform — the ideation playbook expands what you write into a
structured RFC. Be concrete about the problem; the implementation details
can be sparse.

Example:

```markdown
# Faster compile with content-addressed task hashes

Right now `converge compile` re-walks every TASK.md on every invocation.
For large playbooks this gets slow.

Could we hash each TASK.md and cache the parsed AST keyed by content?
Invalidation is trivial — content hash changes → re-parse.

Probably ~200 LOC, would speed up large-playbook compile noticeably.
```

## Lifecycle

1. You drop an idea file here.
2. `rfc-ideation` picks it up in some future epoch.
3. The triage step checks for duplicates against existing RFCs.
4. The draft step expands it into a full RFC under `docs/rfcs/`.
5. The idea file remains here for reference; you can delete it manually
   once the RFC ships, or leave it as a historical record.

The triage step records `source: idea:docs/ideas/<name>.md` in the RFC's
frontmatter so you can trace from RFC back to original idea.

## Avoiding duplicates

The ideation playbook deduplicates against existing RFCs using Jaccard
similarity on normalized problem statements. If you write an idea that's
already covered by an open RFC, it'll be skipped with `decision: dedup-skip`
and recorded in the backlog. No harm done.
