# Playbook: Setup Converge for Any Project

## Mission

**Initialize converge framework in existing projects to track work systematically.**

This playbook guides you through:
1. **Analyzing** project structure and current state
2. **Clarifying** requirements through structured questions
3. **Creating** seed tasks that represent work already done
4. **Generating** plan for remaining work
5. **Executing** to completion

---

## Phase 1: Analyze Project Structure

### Step 1.1: Detect Framework/Tech Stack

```bash
# Scan for framework indicators
ls package.json 2>/dev/null && echo "Node.js/npm project detected"
ls Gemfile 2>/dev/null && echo "Ruby project detected"
ls requirements.txt pyproject.toml 2>/dev/null && echo "Python project detected"
ls go.mod 2>/dev/null && echo "Go project detected"
ls Cargo.toml 2>/dev/null && echo "Rust project detected"

# Detect specific frameworks
cat package.json 2>/dev/null | jq -r '.dependencies | keys[]' | grep -E "^(next|react|vue|angular|svelte|express|fastify)"
```

**Common Framework Patterns:**

| Framework | Indicators | Critical Files | Typical Structure |
|-----------|-----------|----------------|-------------------|
| Next.js | `package.json` with `next` | `next.config.js`, `pages/` or `app/` | `src/`, `public/`, `components/` |
| React (Vite) | `package.json` with `vite` | `vite.config.ts`, `index.html` | `src/`, `public/` |
| Express.js | `package.json` with `express` | `server.js` or `app.js` | `routes/`, `controllers/`, `models/` |
| Python/Django | `requirements.txt`, `manage.py` | `settings.py`, `urls.py` | `apps/`, `templates/`, `static/` |
| Ruby/Rails | `Gemfile`, `config.ru` | `config/routes.rb` | `app/`, `db/`, `config/` |
| Go | `go.mod` | `main.go` | `cmd/`, `internal/`, `pkg/` |

### Step 1.2: Map Current State

```bash
# Count files by type
find . -type f -name "*.ts" -o -name "*.tsx" | wc -l  # TypeScript files
find . -type f -name "*.py" | wc -l                   # Python files
find . -type f -name "*.go" | wc -l                   # Go files

# Check for existing documentation
ls README.md ARCHITECTURE.md DESIGN.md TODO.md 2>/dev/null

# Check for existing tests
find . -type f -name "*.test.*" -o -name "*.spec.*" | wc -l

# Check git status
git status --short 2>/dev/null | wc -l  # Modified files
git log --oneline -10 2>/dev/null        # Recent commits
```

**Document findings:**
```markdown
## Current Project State

**Framework:** [Next.js 15 / React / Django / etc.]
**Language:** [TypeScript / Python / Go / etc.]
**Files:** [123 source files, 45 test files]
**Documentation:** [README.md exists, no ARCHITECTURE.md]
**Git State:** [15 uncommitted changes, last commit: "add feature X"]
**Build Status:** [Builds successfully / Has errors]
```

---

## Phase 2: Clarify Requirements (7 Key Questions)

### Question 1: Project Goal
**Ask:** "What is the end goal of this project? What should exist when it's complete?"

**Example Answers:**
- "Deployed web app with 10 features"
- "Data pipeline processing 1M records/day"
- "Mobile app published to App Store"
- "Library published to npm with docs"

**Capture:**
```markdown
**Goal:** [Specific, measurable outcome]
**Success Criteria:** [How we know it's done]
```

---

### Question 2: Current vs Target State

**Ask:** "What works now, and what needs to be built/fixed?"

**Format:**
```markdown
**Current State:**
- ✅ Authentication system (complete)
- ✅ Database schema (complete)
- ⚠️ API endpoints (50% done - 5/10 complete)
- ❌ Frontend UI (not started)
- ❌ Tests (not started)

**Target State:**
- ✅ All 10 API endpoints working
- ✅ Full frontend with 8 pages
- ✅ 80%+ test coverage
- ✅ Deployed to production
```

---

### Question 3: Critical Files & Folders

**Ask:** "Which files/folders are most important? Which should NOT be modified?"

**Categories:**

**Critical (Must Not Break):**
```markdown
- `src/core/auth.ts` - Authentication logic (CRITICAL)
- `database/schema.sql` - Production schema (CRITICAL)
- `.env.production` - Production secrets (DO NOT COMMIT)
```

**Important (Can Modify Carefully):**
```markdown
- `src/api/` - API endpoints (can extend)
- `src/components/` - UI components (can add)
```

**Generated (Can Modify Freely):**
```markdown
- `dist/` - Build output (regenerated)
- `.converge/` - Task definitions (our workspace)
```

---

### Question 4: Dependencies & Constraints

**Ask:** "Are there external dependencies, deadlines, or constraints?"

**Capture:**
```markdown
**External Dependencies:**
- API key for service X (need to request)
- Database migration (must coordinate with team)

**Technical Constraints:**
- Must work on Node 18+
- Must use existing design system
- Cannot change database schema

**Timeline:**
- MVP needed by [date]
- Beta testing starts [date]
```

---

### Question 5: Existing Documentation

**Ask:** "Where is the project documentation? What format?"

**Common Locations:**
```bash
README.md              # High-level overview
docs/                  # Detailed documentation
ARCHITECTURE.md        # System design
API.md                 # API documentation
CHANGELOG.md           # Version history
TODO.md / ROADMAP.md   # Planned work
```

**If Missing, Create:**
```bash
# Generate from existing code
cat > CURRENT_STATE.md <<EOF
# Project Current State

## Completed
[List from git history + file structure]

## In Progress
[From git status + uncommitted changes]

## Planned
[From TODO comments in code]
EOF
```

---

### Question 6: Testing Strategy

**Ask:** "What testing is needed? What exists already?"

**Levels:**
```markdown
**Unit Tests:** [Jest / pytest / go test]
- Current: 45 tests, 60% coverage
- Target: 80%+ coverage

**Integration Tests:** [Supertest / Cypress]
- Current: None
- Target: All API endpoints covered

**E2E Tests:** [Playwright / Selenium]
- Current: None
- Target: Critical user flows covered
```

---

### Question 7: Deployment & Infrastructure

**Ask:** "How is this deployed? What infrastructure exists?"

**Capture:**
```markdown
**Current Deployment:**
- Platform: [Vercel / AWS / Heroku / None]
- Environment: [Staging exists? Production?]
- CI/CD: [GitHub Actions / None]

**Target Deployment:**
- Automated deployment on push to main
- Preview deployments for PRs
- Monitoring & logging setup
```

---

## Phase 3: Create Seed Tasks (Work Already Done)

**Purpose:** Represent completed work as tasks so we can track "what's left to do"

### Step 3.1: Identify Completed Work

```bash
# What features exist?
ls src/features src/pages src/routes 2>/dev/null

# What's already tested?
find . -name "*.test.*" -o -name "*.spec.*"

# What's already documented?
ls docs/*.md 2>/dev/null
```

### Step 3.2: Create Placeholder Epics

```bash
mkdir -p .converge/epics/00-foundation/tasks/001-setup-project
```

```yaml
# .converge/epics/00-foundation/tasks/001-setup-project/TASK.md
---
title: Project Setup (Already Complete)
outputs:
  - package.json
  - tsconfig.json
  - vite.config.ts
checks:
  - id: package-exists
    cmd: test -f package.json
  - id: deps-installed
    cmd: test -d node_modules
---

# Project Setup

PLACEHOLDER TASK - Work already completed.

This task represents initial project setup that was done manually:
- package.json created
- TypeScript configured
- Build system (Vite) configured
- Dependencies installed

No action needed - just marking as complete.
```

### Step 3.3: Create Seed Tasks for Completed Features

**Example: Authentication Already Done**

```yaml
# .converge/epics/00-foundation/tasks/002-implement-auth/TASK.md
---
title: Authentication System (Already Complete)
dependencies:
  - 001-setup-project
outputs:
  - src/auth/login.ts
  - src/auth/middleware.ts
checks:
  - id: auth-files-exist
    cmd: test -f src/auth/login.ts
  - id: has-tests
    cmd: test -f src/auth/login.test.ts
---

# Authentication System

PLACEHOLDER TASK - Work already completed.

Authentication system implemented:
- Login/logout endpoints
- JWT token generation
- Auth middleware
- Tests passing

No action needed - just marking as complete.
```

### Step 3.4: Mark Placeholders as Complete

```bash
# Initialize converge
converge init --name="[Project Name]"

# Run checks to mark completed tasks
converge run --step  # Each placeholder will pass checks and complete
```

**Result:**
```bash
converge status
# ✅ 00-foundation/001-setup-project (complete)
# ✅ 00-foundation/002-implement-auth (complete)
# ✅ 00-foundation/003-setup-database (complete)
```

---

## Phase 4: Generate Plan for Remaining Work

### Step 4.1: Break Down Target State into Epics

**From Question 2 (Current vs Target State):**

```markdown
**Still TODO:**
- ❌ Frontend UI (0% done)
- ❌ API endpoints (50% done - 5/10 complete)
- ❌ Tests (minimal)
- ❌ Deployment (not setup)

**Convert to Epics:**
01-api-completion       # Finish remaining 5 endpoints
02-frontend-ui          # Build 8 pages
03-testing              # Achieve 80% coverage
04-deployment           # Setup CI/CD
```

### Step 4.2: Create Task Structure

```yaml
# .converge/epics/01-api-completion/tasks/001-implement-users-endpoint/TASK.md
---
title: Implement Users Endpoint
dependencies:
  - 00-foundation.002-implement-auth
outputs:
  - src/api/users.ts
  - src/api/users.test.ts
checks:
  - id: endpoint-exists
    cmd: test -f src/api/users.ts
  - id: test-exists
    cmd: test -f src/api/users.test.ts
  - id: tests-pass
    cmd: npm test src/api/users.test.ts
---

# Implement Users Endpoint

Implement GET /api/users endpoint.

Requirements:
- List all users with pagination
- Require authentication (use existing middleware)
- Return JSON with user data
- Include tests

Dependencies available:
- Auth middleware: src/auth/middleware.ts
- Database client: src/db/client.ts

Output files:
- src/api/users.ts (implementation)
- src/api/users.test.ts (tests)
```

### Step 4.3: Create Tasks for Repetitive Work

**Example: 8 Frontend Pages — create one TASK.md per page**

```yaml
# .converge/epics/02-frontend-ui/tasks/001-generate-dashboard/TASK.md
---
title: Generate Dashboard Page
dependencies:
  - 01-api-completion.005-complete-all-endpoints
outputs:
  - src/pages/dashboard.tsx
checks:
  - id: page-exists
    cmd: test -f src/pages/dashboard.tsx
  - id: route-exists
    cmd: grep -q "/" src/routes.ts
---

# Generate Dashboard Page

Generate the Dashboard page (/).

Requirements:
- Use existing layout components
- Follow design system in src/styles/theme.ts
- Add route to src/routes.ts
- Include loading states
- Handle errors gracefully

Output: src/pages/dashboard.tsx
```

Repeat this pattern for each page (profile, settings, users, etc.).

---

## Phase 5: Framework-Specific Setup

### Next.js Projects

```yaml
# .converge/epics/00-foundation/tasks/000-nextjs-setup/TASK.md
---
title: Next.js Foundation (Placeholder)
outputs:
  - next.config.js
  - app/layout.tsx
  - app/page.tsx
checks:
  - id: next-config
    cmd: test -f next.config.js
  - id: app-dir
    cmd: test -d app
  - id: builds
    cmd: npm run build > /dev/null 2>&1
---

PLACEHOLDER - Next.js already configured
```

**Critical Files to Track:**
```
next.config.js, app/**/*.tsx, app/api/**/*.ts, components/**/*.tsx, styles/**/*.css
```

---

### React + Vite Projects

```yaml
# .converge/epics/00-foundation/tasks/000-react-setup/TASK.md
---
title: React + Vite Foundation (Placeholder)
outputs:
  - vite.config.ts
  - index.html
  - src/main.tsx
  - src/App.tsx
checks:
  - id: vite-config
    cmd: test -f vite.config.ts
  - id: src-dir
    cmd: test -d src
  - id: builds
    cmd: npm run build > /dev/null 2>&1
---

PLACEHOLDER - React + Vite already configured
```

---

### Express.js API Projects

```yaml
# .converge/epics/00-foundation/tasks/000-express-setup/TASK.md
---
title: Express.js Foundation (Placeholder)
outputs:
  - src/server.ts
  - src/app.ts
  - src/routes/index.ts
checks:
  - id: server-exists
    cmd: test -f src/server.ts
  - id: routes-exist
    cmd: test -d src/routes
---

PLACEHOLDER - Express server already configured
```

---

### Python/Django Projects

```yaml
# .converge/epics/00-foundation/tasks/000-django-setup/TASK.md
---
title: Django Foundation (Placeholder)
outputs:
  - manage.py
  - settings.py
  - urls.py
  - requirements.txt
checks:
  - id: manage-exists
    cmd: test -f manage.py
  - id: settings-exist
    cmd: find . -name settings.py | grep -q .
  - id: runs
    cmd: python manage.py check > /dev/null 2>&1
---

PLACEHOLDER - Django already configured
```

---

## Phase 6: Execute Setup

```bash
# Step 1: Initialize converge
converge init --name="[Project Name]"

# Step 2: Verify structure
converge tree

# Expected output:
# 00-foundation/
#   ├── 000-framework-setup ✅ (placeholder)
#   ├── 001-setup-project ✅ (placeholder)
#   └── 002-implement-auth ✅ (placeholder)
# 01-api-completion/
#   ├── 001-implement-users-endpoint ⬜ (pending)
#   └── 002-implement-posts-endpoint ⬜ (pending)
# 02-frontend-ui/
#   └── 001-generate-pages ⬜ (WBS, pending)

# Step 3: Run placeholder tasks (mark completed work as done)
converge run 00-foundation  # All should pass immediately

# Step 4: Verify completed state
converge status
# ✅ 00-foundation/000-framework-setup (complete)
# ✅ 00-foundation/001-setup-project (complete)
# ✅ 00-foundation/002-implement-auth (complete)
# ⬜ 01-api-completion/001-implement-users-endpoint (pending)

# Step 5: Start actual work
converge run --step  # Now runs first real task
```

---

## Complete Setup Example: Next.js Project

```bash
# User Request: "Setup converge for my Next.js project"

# Phase 1: Analyze
ls package.json next.config.js app/  # ✅ Next.js 15 detected

# Phase 2: Ask 7 Questions
# Q1: Goal? → "Add 5 more pages to existing app"
# Q2: Current vs Target? → "3 pages done, need 5 more"
# Q3: Critical files? → "app/layout.tsx (DON'T BREAK), components/ (can extend)"
# Q4: Constraints? → "Must use existing design system"
# Q5: Docs? → "README.md exists, no other docs"
# Q6: Tests? → "None yet, need to add"
# Q7: Deployment? → "Vercel, already deployed"

# Phase 3: Create Seed Tasks
mkdir -p .converge/epics/00-foundation/tasks/001-existing-pages
cat > .converge/epics/00-foundation/tasks/001-existing-pages/TASK.md <<'EOF'
---
title: Existing Pages (Placeholder)
outputs:
  - app/page.tsx
  - app/about/page.tsx
  - app/contact/page.tsx
checks:
  - id: home
    cmd: test -f app/page.tsx
  - id: about
    cmd: test -f app/about/page.tsx
  - id: contact
    cmd: test -f app/contact/page.tsx
---

PLACEHOLDER - These pages already exist
EOF

# Phase 4: Generate Plan — create one task per page
for page in blog services pricing faq team; do
  mkdir -p .converge/epics/01-new-pages/tasks/001-generate-${page}
  cat > .converge/epics/01-new-pages/tasks/001-generate-${page}/TASK.md <<EOF
---
title: Generate ${page} Page
dependencies:
  - 00-foundation.001-existing-pages
outputs:
  - app/${page}/page.tsx
checks:
  - id: exists
    cmd: test -f app/${page}/page.tsx
---

# Generate ${page} Page

Generate the ${page} page using the existing design system.
EOF
done

# Phase 5: Execute
converge run 00-foundation  # Mark existing work complete
converge run --step         # Start generating new pages
```

---

## Success Criteria

✅ **Converge initialized** - `.converge/` directory created
✅ **Current state captured** - Placeholder tasks for completed work
✅ **Requirements clear** - 7 questions answered, documented
✅ **Plan generated** - Epics/tasks for remaining work
✅ **Executable** - Can run `converge status` and see clear path forward

---

## Common Patterns

### Pattern 1: Greenfield Project
```
No existing work → Skip placeholders → Create full plan
00-foundation → 01-setup → 02-implement → 03-test → 04-deploy
```

### Pattern 2: Partially Complete Project
```
Some work done → Create placeholders → Plan remaining work
00-foundation (placeholders) → 01-complete-feature-x → 02-add-feature-y
```

### Pattern 3: Maintenance Project
```
App deployed → Small changes needed → Focused epics
00-foundation (all placeholders) → 01-add-feature → 02-fix-bugs
```

---

## Next Steps After Setup

```bash
# Review plan
converge tree
converge verify

# Start execution
converge run --step  # Or converge run for autonomous mode

# Monitor progress
watch -n 5 converge status

# Debug if needed
# See playbooks/debug.md
```

**Remember:** Setup is just preparation. Real value comes from executing the plan to completion.
