---
kind: container

children:
  - id: setup
    kind: container
    title: Setup smoke test workspace
  - id: verify
    kind: container
    title: Verify smoke test outputs

---

# Goal

Run a minimal end-to-end smoke test of the converge framework: produce a small artifact, then verify it exists and has expected content. The point is to exercise the runner, journal, and check machinery — not to produce anything useful.

# Delegation pattern

**Process Pipeline** — two deterministic stages, each producing a qualitatively different artifact. `setup` writes a smoke artifact; `verify` reads it and asserts shape. Linear DAG: `setup → verify`. Two phases is the minimum that still exercises sequencing and dependency resolution.

# Children

## setup — Setup smoke test workspace
- **id**: setup
- **kind**: container
- **objective**: Produce a smoke artifact file with known content the verify phase can assert against.
- **description**: Create a workspace directory and write a small deterministic artifact (e.g. a JSON or text file with a known marker). This phase exists so the runner has something to do, the journal has events to record, and the next phase has a real input to check. Internal structure (single file vs. multiple writes) will be planned at the next level.
- **inputs**: `.converge/playbooks/smoke-test/playbook.yml`
- **dependencies**: (none)
- **tags**: setup, smoke

## verify — Verify smoke test outputs
- **id**: verify
- **kind**: container
- **objective**: Confirm the setup phase's artifact exists and contains the expected marker, proving the framework ran end-to-end.
- **description**: Read the artifact produced by `setup` and run deterministic checks (file presence, content match). A failure here means either the runner didn't execute `setup`, dependencies aren't honored, or the journal is lying about success. Internal check breakdown will be planned at the next level.
- **inputs**: artifact(s) produced by `setup`
- **dependencies**: setup
- **tags**: verify, smoke

# Test points

- **setup → verify boundary**: artifact file exists and is non-empty before `verify` runs.
- **playbook-level invariant**: after the full run, the journal records both phases as completed and the artifact's content marker matches what `setup` wrote.

# Open questions

- What artifact format is preferred for the smoke marker — JSON, plain text, or a file the framework already produces (e.g. a journal entry)?
- Should the smoke test clean up after itself, or leave the artifact for inspection?
- Is there an existing convention in this repo for where smoke-test workspaces live (e.g. `examples/` vs. a tmp dir)?
