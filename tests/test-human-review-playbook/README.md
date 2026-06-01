# Human Review Playbook Fixture

Static fixtures copied into a temporary workspace by `tests/review-flow.test.ts`
so the framework-level human-review flow can run against real published
playbooks instead of ones invented at runtime.

- **`handoff-review`** — a single task (`manager-report`). Its body does the
  main work (`docs/findings.json`); its `handoff:` block instructs the agent to
  generate the human-review report (`docs/review.html`). A `stub:` block lets the
  test exercise the full run → `awaiting-review` → approve/reject flow with no
  live AI (`converge run --stub`). See RFC 0047.
- **`pipeline-review`** — gateway `review:` blocks (RFC 0039) kept as reference
  coverage for the human-facing `prompt` shape.
