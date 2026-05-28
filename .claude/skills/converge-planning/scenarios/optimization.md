# Optimization / Benchmark-Driven Exploration — Worked Example

## When to use this scenario

**Trigger phrases:**
- "optimize" / "find the best candidate"
- "benchmark-driven exploration"
- "genetic algorithm"
- "score and rank candidates"
- "generate → score → select loop"

**What it covers:** `(generate → score per-candidate → select) × N`. Candidates are scored on objective dimensions, top-K drives next generation.

---

`(generate → score → select) × N → report`. Used when the problem is open-ended and you need to discover better solutions by scoring each candidate against objective dimensions.

## The thinking sequence applied

1. **What does it contain?** A population of candidates, a scoring function, a selection mechanism
2. **Composition?** Epoch loop: generate candidates → score each → select best → generate next
3. **Static vs. dynamic?** Bootstrap is static. Candidates are dynamic (spawned at runtime). Scoring is dynamic (parallel per candidate).
4. **Modes?** Bootstrap: spawner. Score: parallel spawner. Select: leaf.

---

## The optimization loop

```
root bootstrap
  └─▶ epoch-N
        ├─▶ generate-candidates        ← spawner: N new candidates
        ├─▶ score-candidate           ← spawner: score each (parallel)
        ├─▶ consolidate-scores       ← merge all scores
        ├─▶ select-best              ← rank, pick top-K
        └─▶ next-generation          ← produce candidates for epoch-N+1
  └─▶ final-report
```

**Core pattern:**
1. **Generate** — produce N candidates (from seed, crossover, beams, etc.)
2. **Score per candidate** — benchmark each on objective dimensions (parallel spawner)
3. **Consolidate** — merge all scores into a generation report
4. **Select** — pick best or top-K for next generation
5. **Repeat** — until convergence (score threshold met or no improvement)
6. **Final report** — best candidate with evidence

---

## playbook.yml

**No `tasks:` entry.** Single bootstrap spawns the full epoch chain via `converge apply`.

```yaml
name: optimization
description: >-
  Optimization loop: generate → score → select → generate next → until convergence.
  Used when the problem is open-ended and you need to discover better solutions.

run:
  mode: loop
  maxIterations: 30
  resume: true
```

---

## templates/ structure

```
templates/
├── 001-generate/                    ← spawner: generate N candidates
│   └── TASK.md
│   └── tasks/templates/
│       └── candidate/TASK.md      ← DYNAMIC: one per candidate
├── 002-score/
│   ├── TASK.md                     ← spawner: score each candidate (parallel)
│   └── tasks/templates/
│       └── score-single/TASK.md
├── 003-consolidate/
│   └── TASK.md
├── 004-select/
│   └── TASK.md
├── 005-crossover/                ← genetic algorithm variant
│   └── TASK.md
└── 006-report/
    └── TASK.md
```

---

## Phase details

### 001-generate — spawner, generate N candidates

```yaml
templates/001-generate/TASK.md:
  ---
  id: generate-{{epoch}}
  title: "Generate candidates — epoch {{epoch}}"
  mode: spawner
  spawn:
    min_children: 1
  ---
  # For epoch 0: generate from seed (no parent)
  # For epoch > 0: read selection.json, apply crossover/mutation
  for i in $(seq 1 $POPULATION_SIZE); do
    converge spawn "candidate-${EPOCH}-$(printf '%03d' $i)" candidate \
      --var epoch="$EPOCH" --var candidateId="$i"
  done
```

### 002-score — parallel spawner, score each candidate

```yaml
templates/002-score/TASK.md:
  ---
  id: score-{{epoch}}
  title: "Score candidates — epoch {{epoch}}"
  mode: spawner
  spawn:
    min_children: 1
  ---
  for candidate in output/candidates/gen-${EPOCH}/*.json; do
    CANDIDATE_ID=$(basename "$candidate" .json)
    converge spawn "score-${CANDIDATE_ID}" score-single \
      --var candidateFile="$candidate"
  done
```

### score-single — DYNAMIC template, score one candidate

```yaml
templates/002-score/tasks/templates/score-single/TASK.md:
  ---
  id: score-{{candidateId}}
  title: "Score: {{candidateId}}"
  inputs:
    - output/candidates/gen-{{epoch}}/{{candidateId}}.json
  outputs:
    - output/scored/gen-{{epoch}}/{{candidateId}}.json
  checks:
    - id: scored
      cmd: test -s output/scored/gen-{{epoch}}/{{candidateId}}.json
  ---
  # Run benchmarks against this candidate's parameters
  # Output structured score:
```

**Score output structure:**
```json
{
  "candidateId": "gen-2-c03",
  "epoch": 2,
  "scores": {
    "dimension-A": 0.82,
    "dimension-B": 0.71,
    "dimension-C": 0.65
  },
  "fitness": 0.74,
  "strengths": ["high benchmark potential", "compute optimal"],
  "weaknesses": ["sensitivity to warmup ratio"]
}
```

### 003-consolidate — merge all scores

```yaml
templates/003-consolidate/TASK.md:
  ---
  id: consolidate-{{epoch}}
  title: "Consolidate scores — epoch {{epoch}}"
  inputs:
    - output/scored/gen-{{epoch}}/
  outputs:
    - output/scored/gen-{{epoch}}.json
  ---
  # Merge all scored/*.json into one generation report
  # Compute generation-level statistics
```

### 004-select — rank and select best for next generation

```yaml
templates/004-select/TASK.md:
  ---
  id: select-{{epoch}}
  title: "Select best — epoch {{epoch}}"
  inputs:
    - output/scored/gen-{{epoch}}.json
    - output/best-candidate.json  # all-time best
  outputs:
    - output/selection.json
  ---
  # Rank all candidates by fitness
  # Write top-K to selection.json
  # Update best-candidate.json if new best found

  # Convergence check:
  if [ "$(cat output/best-candidate.json | jq '.fitness')" -ge "$THRESHOLD" ]; then
    touch output/halt.marker
  fi
```

---

## Three real examples

### evolutionary-optimization (genetic algorithm)

```
seed → evaluate-batch (parallel) → consolidate → select → crossover → [next gen]
```

Score dimensions: benchmarkPotential, trainingEfficiency, scalingProperties, robustness.
Convergence: fitness >= threshold (0.9).

### frontier-research (beam search)

```
frontier-analysis → beam-spawning (N beams) → beam-execution (parallel) → beam-scoring (parallel) → selection-merge → gradient-step
```

Score dimensions: novelty, evidence, coherence, depth, generativity.
Convergence: insightDelta < threshold for 2 consecutive epochs.

### skillopt (skill training)

```
train (converger, wave per epoch) → final-eval → report
```

Score: hard_score (binary) + soft_score (graded).
Convergence: plateau (< 0.01 delta for 3 epochs) or degradation.

---

## Convergence criteria

Three patterns:

**Score-based:**
```bash
if [ "$(cat best-candidate.json | jq '.fitness')" -ge 0.9 ]; then
  touch output/halt.marker
fi
```

**Delta-based:**
```bash
# If improvement < epsilon for N consecutive epochs → halt
if [ $(echo "$delta < 0.01" | bc) -eq 1 ]; then
  CONSECUTIVE_PLATEAU=$((CONSECUTIVE_PLATEAU + 1))
else
  CONSECUTIVE_PLATEAU=0
fi
if [ "$CONSECUTIVE_PLATEAU" -ge 3 ]; then
  touch output/halt.marker
fi
```

**Degradation-based:**
```bash
if [ "$(cat current.json | jq '.score')" -lt "$(cat baseline.json | jq '.score')" ]; then
  DEGRADATION_COUNT=$((DEGRADATION_COUNT + 1))
else
  DEGRADATION_COUNT=0
fi
if [ "$DEGRADATION_COUNT" -ge 3 ]; then
  touch output/halt.marker
fi
```

---

## Key insight: scoring is the differentiator

The optimization loop is structurally identical to the pure exploration loop — same epoch chaining, same `converge apply` pattern, same `mode: loop` + `resume: true`.

The difference is what drives the next epoch:

| Pattern | Currency between epochs | Driver |
|---|---|---|
| Pure exploration | catalog.json | synthesize outputs next catalog |
| Optimization | candidates + scores | best candidates drive next generation |

Both use a **catalog of items** as the dynamic artifact — but in optimization the catalog is scored and ranked, not just synthesized.

---

## Structural summary

| Element | Pattern |
|---|---|
| Entry point | Single bootstrap task |
| Generate spawner | N candidates per epoch |
| Score spawner | Parallel per candidate |
| Score output | Structured JSON with dimensions + fitness |
| Select | Rank, pick top-K, update best |
| Convergence | halt.marker when threshold met or plateau |
| Resume | Epoch counter persisted, picks up at next epoch |
