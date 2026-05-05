---
kind: container

children:
  - id: prepare
    kind: container
    title: Prepare progress fixture
  - id: emit
    kind: container
    title: Emit progress events
  - id: verify
    kind: container
    title: Verify progress output

---

# Goal

Exercise the converge progress-reporting path end-to-end with a minimal,
deterministic playbook. The run should produce observable progress events
through a short pipeline (prepare → emit → verify) so that progress UI
and journal handling can be validated. The artifact is the verification
report; everything else is scaffolding.

# Delegation pattern

**Process Pipeline.** Three deterministic stages, each producing a
qualitatively different artifact: a fixture file, a stream of progress
events, and a verification report. The DAG is strictly linear:
`prepare → emit → verify`. No fan-out is needed — the prompt asks for a
test, not a multi-asset workflow.

# Children

## prepare — Prepare progress fixture
- **id**: prepare
- **kind**: container
- **objective**: Produce a small input fixture and config the emit phase will consume.
- **description**: Sets up a deterministic fixture (a list of step labels and any tunables like step count or delay) so the emit phase has well-defined work to do. Keeps the test reproducible across runs.
- **inputs**: `.converge/playbooks/test-progress-fresh/playbook.yml`
- **dependencies**:
- **tags**: setup, fixture

## emit — Emit progress events
- **id**: emit
- **kind**: container
- **objective**: Run a workload that emits progress events covering start, mid-progress, and completion.
- **description**: Consumes the fixture from `prepare` and walks through each step, emitting progress at predictable points. This is the phase under test — its job is to produce the events that `verify` will inspect.
- **inputs**: outputs from `prepare`
- **dependencies**: prepare
- **tags**: emit, progress

## verify — Verify progress output
- **id**: verify
- **kind**: container
- **objective**: Confirm the expected progress events were emitted in the expected order and shape.
- **description**: Reads the journal/output from `emit` and asserts that the progress sequence is well-formed (monotonic, complete, terminating). Produces a short pass/fail report that becomes the playbook's deliverable.
- **inputs**: outputs from `emit`
- **dependencies**: emit
- **tags**: verify, assertion

# Test points

- After `prepare`: fixture file exists and is well-formed.
- After `emit`: progress events have been written and the run did not error.
- After `verify`: assertion report exists and reports pass; this gates
  playbook success.
- Cross-phase invariant: the number of progress events observed in
  `verify` matches the step count declared by `prepare`.

# Open questions

- What is the source of truth for "progress events" in this codebase —
  journal events, stdout markers, or a dedicated progress channel? The
  emit/verify children's internal plans depend on this.
- Should `emit` simulate work with sleeps/delays, or run instantly? This
  affects whether the test is also exercising time-based progress UI.
- Is there an existing progress-test playbook (e.g. `test-progress`) this
  one should mirror, or is this a clean-slate fixture?
