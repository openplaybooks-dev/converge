# Converge Converge: Idea to Production

**Goal**: Define a convergence goal set that takes an idea or PRD and produces a production-ready web application through automated, verifiable phases.

---

## The Core Insight

The convergence loop works differently at each development phase:

| Phase | Check Type | Confidence | Example |
|-------|-----------|------------|---------|
| Ideation & Requirements | **File existence + structure** | Low — "does the artifact exist and have sections?" | `test -f .converge/requirements.md && grep -q "## User Stories" .converge/requirements.md` |
| Design & Architecture | **Schema validation + structure** | Medium — "does the design doc follow the template?" | `ajv validate --schema design-schema.json .stitch/DESIGN.md` |
| Implementation | **Static analysis** | High — "does the code compile and lint?" | `tsc --noEmit && eslint .` |
| Testing & QA | **Deterministic** | Very High — "do all tests pass?" | `vitest run && playwright test` |
| Production Readiness | **Deterministic** | Very High — "does it build, pass security, meet perf?" | `npm run build && npm audit && lighthouse --budget` |

The trick: **each phase's outputs become the next phase's inputs**. The convergence loop at phase N can only start when phase N-1's goals are satisfied.

---

## Complete Goal Set: 7 Phases

### Phase 0: Project Bootstrap

**Goal**: Project structure exists with Converge configuration.

```yaml
goal: project-bootstrapped
description: "Converge project initialized with valid configuration"
checks:
  - id: converge-dir-exists
    cmd: "test -d .converge"
  - id: project-config-valid
    cmd: "converge verify"
  - id: git-initialized
    cmd: "test -d .git"
outputs:
  - .converge/PROJECT.md
  - .converge/epics/
  - package.json
```

**Convergence**: 1-2 iterations. Scaffold + verify.

---

### Phase 1: Requirements & Analysis

**Goal**: Clear, structured requirements derived from idea/PRD.

```yaml
goal: requirements-complete
description: "Structured requirements with user stories, data model, and acceptance criteria"
inputs:
  - idea.md  # or PRD.md — the starting point
checks:
  - id: requirements-exists
    cmd: "test -f .converge/analysis/requirements.md"
  - id: requirements-has-stories
    cmd: "grep -c '## User Stor' .converge/analysis/requirements.md | xargs test 0 -lt"
  - id: requirements-has-acceptance
    cmd: "grep -c '## Acceptance Criteria' .converge/analysis/requirements.md | xargs test 0 -lt"
  - id: data-model-exists
    cmd: "test -f .converge/analysis/data-model.md"
  - id: sitemap-exists
    cmd: "test -f .converge/analysis/sitemap.md"
  - id: sitemap-has-routes
    cmd: "grep -cE '^- /' .converge/analysis/sitemap.md | xargs test 2 -le"
outputs:
  - .converge/analysis/requirements.md
  - .converge/analysis/data-model.md
  - .converge/analysis/sitemap.md
  - .converge/analysis/tech-stack.md
```

**Skill**: `converge-planning` (ANALYZE → DISCOVER → ARCHITECT → VALIDATE)
**Agent**: Requirements analyst
**Convergence**: 2-4 iterations. Generate docs, verify structure, fill missing sections.

---

### Phase 2: Design System & UX

**Goal**: Complete design system + screen designs for all routes in sitemap.

```yaml
goal: design-complete
description: "Design system, screen prompts, and HTML designs for all screens"
inputs:
  - .converge/analysis/requirements.md
  - .converge/analysis/sitemap.md
  - .converge/analysis/data-model.md
checks:
  - id: design-system-exists
    cmd: "test -f .stitch/DESIGN.md"
  - id: design-has-colors
    cmd: "grep -q 'color' .stitch/DESIGN.md"
  - id: design-has-typography
    cmd: "grep -q 'font' .stitch/DESIGN.md"
  - id: sitemap-file-exists
    cmd: "test -f .stitch/SITE.md"
  - id: all-screens-have-prompts
    cmd: |
      ROUTES=$(grep -cE '^- /' .converge/analysis/sitemap.md)
      PROMPTS=$(ls .stitch/prompts/*.md 2>/dev/null | wc -l)
      test "$PROMPTS" -ge "$ROUTES"
  - id: all-screens-have-designs
    cmd: |
      PROMPTS=$(ls .stitch/prompts/*.md 2>/dev/null | wc -l)
      DESIGNS=$(ls .stitch/designs/*/design.html 2>/dev/null | wc -l)
      test "$DESIGNS" -ge "$PROMPTS"
outputs:
  - .stitch/DESIGN.md
  - .stitch/SITE.md
  - .stitch/prompts/*.md
  - .stitch/designs/*/design.html
```

**Skills**: `stitch-design`, `stitch-prompt`, `stitch-generate`
**Convergence**: 3-8 iterations. WBS spawns per-screen subtasks. Each screen converges independently.

---

### Phase 3: Data Layer

**Goal**: Database schema, API types, and data access layer.

```yaml
goal: data-layer-complete
description: "Database schema, TypeScript types, and data access functions"
inputs:
  - .converge/analysis/data-model.md
checks:
  - id: schema-exists
    cmd: "test -f src/db/schema.ts || test -f prisma/schema.prisma"
  - id: schema-valid
    cmd: "npx prisma validate 2>/dev/null || npx drizzle-kit check 2>/dev/null"
  - id: types-generated
    cmd: "test -f src/types/database.ts"
  - id: types-compile
    cmd: "tsc --noEmit src/types/database.ts"
  - id: seed-data-exists
    cmd: "test -f src/db/seed.ts"
outputs:
  - src/db/schema.ts (or prisma/schema.prisma)
  - src/types/database.ts
  - src/db/seed.ts
```

**Skills**: `sheets-modeling` (if from spreadsheets), or schema generation skill
**Convergence**: 2-4 iterations. Generate schema, validate, fix type errors.

---

### Phase 4: Implementation

**Goal**: All screens implemented as React components, routing works, TypeScript compiles.

```yaml
goal: implementation-complete
description: "All screens implemented, routing configured, zero TypeScript errors"
inputs:
  - .stitch/designs/*/design.html
  - .stitch/DESIGN.md
  - src/db/schema.ts
checks:
  - id: typescript-clean
    cmd: "tsc --noEmit"
    parse: tsc  # built-in parser: file:line → Gap[]
  - id: lint-clean
    cmd: "eslint src/ --format json --max-warnings 0"
    parse: eslint
  - id: all-screens-implemented
    cmd: |
      DESIGNS=$(ls .stitch/designs/*/design.html 2>/dev/null | wc -l)
      COMPONENTS=$(find src/screens -name '*.tsx' 2>/dev/null | wc -l)
      test "$COMPONENTS" -ge "$DESIGNS"
  - id: router-configured
    cmd: "grep -q 'createBrowserRouter\\|Routes' src/App.tsx || grep -q 'router' src/app/layout.tsx"
  - id: design-tokens-extracted
    cmd: "test -f src/styles/design-tokens.ts"
  - id: build-succeeds
    cmd: "npm run build"
outputs:
  - src/screens/**/*.tsx
  - src/styles/design-tokens.ts
  - src/App.tsx (or src/app/layout.tsx)
```

**Skills**: `stitch-react-components`, `react-prune`
**Convergence**: 5-15 iterations. This is the longest phase. Each tsc/eslint error becomes a targeted fix task. The static analysis loop is strongest here.

---

### Phase 5: Testing

**Goal**: Unit tests, integration tests, and E2E tests all pass.

```yaml
goal: tests-pass
description: "Comprehensive test coverage with all tests passing"
inputs:
  - src/screens/**/*.tsx
  - src/db/schema.ts
checks:
  - id: unit-tests-pass
    cmd: "vitest run --reporter=json"
    parse: vitest
  - id: coverage-threshold
    cmd: "vitest run --coverage --coverage.thresholds.lines=70"
  - id: e2e-tests-pass
    cmd: "playwright test --reporter=json"
    parse: playwright
  - id: no-console-errors
    cmd: "playwright test --grep 'no-console-errors'"
outputs:
  - src/**/*.test.ts
  - src/**/*.test.tsx
  - e2e/**/*.spec.ts
  - coverage/lcov.info
```

**Convergence**: 3-10 iterations. Generate tests, run, fix failures, repeat. Coverage gaps become tasks.

---

### Phase 6: Production Readiness

**Goal**: Build optimized, security clean, accessible, deployment configured.

```yaml
goal: production-ready
description: "Optimized build, zero vulnerabilities, accessible, deployable"
checks:
  - id: build-succeeds
    cmd: "npm run build"
  - id: no-vulnerabilities
    cmd: "npm audit --audit-level=high"
  - id: bundle-size-ok
    cmd: |
      SIZE=$(du -sk dist/ | cut -f1)
      test "$SIZE" -lt 5000  # < 5MB
  - id: lighthouse-performance
    cmd: "lighthouse http://localhost:3000 --output=json --chrome-flags='--headless' | jq '.categories.performance.score >= 0.8'"
  - id: lighthouse-accessibility
    cmd: "lighthouse http://localhost:3000 --output=json --chrome-flags='--headless' | jq '.categories.accessibility.score >= 0.9'"
  - id: env-configured
    cmd: "test -f .env.example && test -f Dockerfile || test -f vercel.json"
  - id: readme-exists
    cmd: "test -f README.md && wc -l README.md | awk '{print $1}' | xargs test 20 -le"
outputs:
  - dist/ (or .next/ or build/)
  - Dockerfile (or vercel.json or netlify.toml)
  - .env.example
  - README.md
```

**Convergence**: 2-5 iterations. Fix audit findings, optimize bundle, improve scores.

---

## The Full Convergence Command

```bash
# Converge the entire project from idea to production
converge converge \
  --goals "project-bootstrapped,requirements-complete,design-complete,data-layer-complete,implementation-complete,tests-pass,production-ready" \
  --input idea.md

# Or converge a single phase
converge converge --goals "implementation-complete"

# Or resume from where you left off
converge converge --resume
```

---

## Phase Dependencies (DAG)

```
Phase 0: project-bootstrapped
    │
    ▼
Phase 1: requirements-complete
    │
    ├────────────────┐
    ▼                ▼
Phase 2:          Phase 3:
design-complete   data-layer-complete
    │                │
    └───────┬────────┘
            ▼
Phase 4: implementation-complete
            │
            ▼
Phase 5: tests-pass
            │
            ▼
Phase 6: production-ready
```

Phases 2 and 3 can run **in parallel** (design doesn't depend on data layer). Phase 4 waits for both.

---

## Check Rigor Progression

```
Phase 0-1:  Existence checks          ← "does the file exist?"
Phase 2:    Structure checks           ← "does it have the right sections?"
Phase 3:    Schema validation          ← "does the schema parse?"
Phase 4:    Static analysis            ← "tsc + eslint — zero errors"
Phase 5:    Test execution             ← "all tests pass + coverage"
Phase 6:    Production tooling         ← "build + audit + lighthouse"
```

Each phase's checks are MORE deterministic than the previous. The convergence loop gets tighter and more reliable as you progress.

---

## What Makes This Work

### 1. Outputs become inputs
Phase 1 outputs `.converge/analysis/sitemap.md` → Phase 2 reads it to know which screens to design. Phase 2 outputs `.stitch/designs/` → Phase 4 reads them to know which components to implement. The chain is self-documenting.

### 2. Checks are the source of truth
No task is "done" because an AI said so. It's done because `tsc --noEmit` exits 0. This eliminates the "AI thinks it's done but it's broken" problem.

### 3. Each phase converges independently
Phase 4 (implementation) might take 15 iterations while Phase 3 (data layer) takes 2. Each phase has its own convergence loop with its own stall detection.

### 4. WBS handles the "thousands of tasks" problem
A 50-screen app = 50 design subtasks + 50 implementation subtasks + 50 test subtasks = 150+ tasks. WBS spawns these dynamically from the sitemap. No manual task definition needed.

### 5. Failure at any phase is recoverable
If Phase 4 stalls after 15 iterations, Converge:
- Writes LEARN.md with failure analysis
- Tries different repair strategies
- Escalates to human if stuck
- All previous phases remain intact (checkpointed)

---

## Realistic Scale Estimate

| Project Size | Screens | Estimated Tasks | Estimated Iterations | Feasibility |
|-------------|---------|-----------------|---------------------|-------------|
| **Small** (landing page + dashboard) | 3-5 | 30-50 | 20-40 | High — works today |
| **Medium** (SaaS app) | 10-20 | 100-200 | 50-100 | Medium — needs parallel execution |
| **Large** (enterprise app) | 50+ | 500-1000 | 200-500 | Requires distributed workers |

---

## Honest Limitations

### What converge handles well:
- **Structure creation** — scaffolding, file generation, boilerplate
- **Deterministic fixes** — type errors, lint violations, missing imports
- **Template-based generation** — screens from designs, components from schemas
- **Quality gates** — build, test, lint, audit, lighthouse

### What converge handles poorly (today):
- **Subjective quality** — "does this UI look good?" (no deterministic check)
- **Business logic correctness** — "does the billing calculation work?" (needs human-written tests)
- **Performance optimization** — lighthouse can detect, but fixing is creative
- **Complex state management** — no check for "is the Redux store well-structured?"

### The honest gap:
Phases 0-1 have **weak checks** (file existence ≠ quality). An AI can create a `requirements.md` that passes all structural checks but contains nonsense. The convergence loop catches _structural_ problems, not _semantic_ ones.

**Mitigation**: Human review gates between phases. Converge pauses and asks "Phase 1 complete — review requirements before proceeding?"

---

## Implementation Priority

To make this real, the framework needs (in order):

| Priority | What | Effort | Impact |
|----------|------|--------|--------|
| **1** | Shell-based check primitives (cmd → exitCode → satisfied) | Small | Unlocks all phases |
| **2** | Built-in parsers (tsc, eslint, vitest output → Gap[]) | Medium | Makes Phase 4-5 powerful |
| **3** | `converge converge` CLI command | Medium | The entry point |
| **4** | Phase dependency DAG (parallel Phase 2+3) | Medium | Faster execution |
| **5** | Human review gates between phases | Small | Quality control |
| **6** | Worker pool (parallel subtasks within a phase) | Large | Scale to 50+ screens |
