---
kind: container

children:
  - id: prepare
    kind: container
    title: Prepare progress smoke fixtures
  - id: exercise
    kind: container
    title: Exercise progress endpoint via curl
  - id: verify
    kind: container
    title: Verify progress output

---

# Goal

Run a minimal smoke test against the converge "progress" surface using `curl`: stand up a known fixture, hit the progress endpoint, and assert the response shape proves progress reporting is alive end-to-end. The point is to catch regressions in the progress wire format, not to validate semantics of any particular run.

# Delegation pattern

**Process Pipeline** — three deterministic stages, each producing a qualitatively different artifact. `prepare` stages a known input (a playbook run or fixture journal the endpoint can read), `exercise` issues the curl call and captures the response, `verify` asserts the captured output matches an expected shape. Linear DAG: `prepare → exercise → verify`. Three phases is the minimum that separates "set up the world", "make the call", and "check the call" — keeping them distinct means a failure points at a specific layer (fixture vs. transport vs. response shape).

# Children

## prepare — Prepare progress smoke fixtures
- **id**: prepare
- **kind**: container
- **objective**: Put the system into a known state where the progress endpoint has something deterministic to report.
- **description**: Stage whatever the progress endpoint reads from — a fixture journal, a started run, or a recorded session — so the curl call in the next phase has a stable, known-shape thing to fetch. The exact mechanism (start a real run vs. drop a fixture file vs. rely on existing journal entries) will be decided at the next planning level once the open questions below are answered.
- **inputs**: `.converge/playbooks/test-progress-curl/playbook.yml`
- **dependencies**: (none)
- **tags**: setup, fixture

## exercise — Exercise progress endpoint via curl
- **id**: exercise
- **kind**: container
- **objective**: Issue a `curl` request against the progress endpoint and capture the raw response into a file the verify phase can read.
- **description**: This is the actual smoke act — `curl` the progress endpoint (likely the run events SSE stream or a run-results endpoint, see open questions) using the fixture from `prepare`, and persist the response (status code, headers, body) to disk. Internal breakdown (single curl vs. multiple calls, streaming handling) belongs to the next planning level.
- **inputs**: fixture(s) produced by `prepare`
- **dependencies**: prepare
- **tags**: exercise, curl

## verify — Verify progress output
- **id**: verify
- **kind**: container
- **objective**: Assert the captured curl response proves progress reporting is functioning — correct status, expected fields, non-empty event stream.
- **description**: Run deterministic checks against the captured response from `exercise`: HTTP status, content-type, presence of expected event/progress markers. A failure here means the endpoint is wired wrong, the fixture didn't produce progress data, or the wire format changed unexpectedly. Specific assertions will be planned at the next level once the endpoint shape is pinned down.
- **inputs**: response capture(s) produced by `exercise`
- **dependencies**: exercise
- **tags**: verify, smoke

# Test points

- **prepare → exercise boundary**: fixture is in place (file/run/journal entry the endpoint depends on exists and is readable).
- **exercise → verify boundary**: response capture file exists and is non-empty.
- **playbook-level invariant**: after the full run, the captured response contains the expected progress markers and the journal records all three phases as completed.

# Open questions

- Which "progress" surface is the target? Candidates in this repo: the planner SSE stream at `apps/planner/src/app/api/runs/[playbook]/events/route.ts`, the run-results endpoint at `apps/planner/src/app/api/playbooks/[name]/run-results/route.ts`, or a CLI-level progress reporter. The curl strategy depends on which.
- Does `exercise` need the planner dev server running, and if so, who starts it — the playbook, or is it assumed to be up?
- What counts as "passing" progress output — any 200 with non-empty body, or specific event types/fields? This drives the assertions in `verify`.
- Should the smoke test target a freshly started run (more realistic, more flaky) or a pre-recorded fixture journal (more deterministic, less true smoke)?
