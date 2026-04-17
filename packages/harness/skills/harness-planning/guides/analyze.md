# Phase 1: Analyze Project

## Mission

Scan the project to understand what exists, what tech stack is used, and what state things are in. This creates the foundation for all planning decisions.

**Output:** `.harness/analysis.md`

---

## Step 1.1: Detect Tech Stack

```bash
# Package manager & runtime
ls package.json Gemfile requirements.txt pyproject.toml go.mod Cargo.toml pom.xml 2>/dev/null

# Framework detection (Node.js)
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | grep -E "^(next|react|vue|angular|svelte|express|fastify|nest|hono|remix|astro)"

# Framework detection (Python)
cat requirements.txt pyproject.toml 2>/dev/null | grep -iE "(django|flask|fastapi|streamlit|gradio)"

# Build tools
ls vite.config.* webpack.config.* rollup.config.* tsconfig.json tailwind.config.* 2>/dev/null
```

**Capture in analysis.md:**
```markdown
## Tech Stack
- **Runtime:** Node.js 20 / Python 3.12 / Go 1.22
- **Framework:** Next.js 15 / Django 5 / Express 4
- **Language:** TypeScript / Python / Go
- **Build:** Vite / Webpack / None
- **Styling:** Tailwind / CSS Modules / Styled Components
- **Package Manager:** npm / yarn / pnpm / pip / cargo
```

---

## Step 1.2: Map File Structure

```bash
# Directory overview (top 2 levels)
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' | sort

# File count by type
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | sed 's/.*\.//' | sort | uniq -c | sort -rn | head -20

# Source file count
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) -not -path '*/node_modules/*' | wc -l
```

**Capture:**
```markdown
## File Structure
- **Source files:** 85
- **Test files:** 12
- **Config files:** 8
- **Key directories:**
  - `src/` — Application source
  - `src/components/` — UI components (23 files)
  - `src/api/` — API routes (8 files)
  - `tests/` — Test suite
```

---

## Step 1.3: Assess Current State

```bash
# Git state
git log --oneline -10 2>/dev/null
git status --short 2>/dev/null | wc -l

# Build status
npm run build 2>&1 | tail -5    # or equivalent
npm test 2>&1 | tail -10        # or equivalent

# Existing documentation
ls README.md ARCHITECTURE.md DESIGN.md TODO.md CHANGELOG.md docs/ 2>/dev/null

# Existing harness
ls -la .harness/ 2>/dev/null
```

**Capture:**
```markdown
## Current State
- **Build:** Passes / Fails (error: ...)
- **Tests:** 12 passing, 3 failing
- **Last commit:** "feat: add user dashboard" (2 days ago)
- **Uncommitted:** 4 modified files
- **Documentation:** README.md exists, no architecture docs
- **Harness:** Not initialized / Exists with 3 epics
```

---

## Step 1.4: Identify Patterns & Conventions

```bash
# Naming conventions
ls src/components/ 2>/dev/null | head -10   # PascalCase? kebab-case?
ls src/api/ 2>/dev/null | head -10          # Route naming pattern

# State management
grep -rl "zustand\|redux\|mobx\|recoil\|jotai\|pinia\|vuex" src/ 2>/dev/null | head -5

# API patterns
grep -rl "fetch\|axios\|trpc\|graphql\|useSWR\|useQuery" src/ 2>/dev/null | head -5

# Testing patterns
ls src/**/*.test.* src/**/*.spec.* tests/ __tests__/ 2>/dev/null | head -5
```

**Capture:**
```markdown
## Patterns & Conventions
- **Naming:** PascalCase components, camelCase functions, kebab-case files
- **State:** Zustand stores in `src/stores/`
- **API:** REST with fetch, routes in `src/api/`
- **Tests:** Jest + React Testing Library, co-located with source
- **Styling:** Tailwind utility classes, no CSS modules
```

---

## Step 1.5: Map External Dependencies

```bash
# External services (env vars)
grep -r "API_KEY\|API_URL\|DATABASE_URL\|REDIS_URL\|AWS_\|STRIPE_\|AUTH0_" .env.example .env.local 2>/dev/null

# Third-party integrations
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | grep -vE "^(react|next|vue|express|typescript|@types)"
```

**Capture:**
```markdown
## External Dependencies
- **Database:** PostgreSQL (DATABASE_URL)
- **Auth:** Auth0 (AUTH0_DOMAIN, AUTH0_CLIENT_ID)
- **Payment:** Stripe (STRIPE_SECRET_KEY)
- **Storage:** AWS S3 (AWS_ACCESS_KEY_ID)
- **APIs:** OpenAI, SendGrid
```

---

## Step 1.6: Write analysis.md

Combine all findings into `.harness/analysis.md`:

```markdown
# Project Analysis

## Summary
[One paragraph: what this project is, current state, key tech choices]

## Tech Stack
[From Step 1.1]

## File Structure
[From Step 1.2]

## Current State
[From Step 1.3]

## Patterns & Conventions
[From Step 1.4]

## External Dependencies
[From Step 1.5]

## Completed Work
- [Feature/component that's done]
- [Feature/component that's done]

## In-Progress Work
- [Feature at X% completion]

## Known Issues
- [Build errors, failing tests, tech debt]
```

---

## Success Criteria

- `.harness/analysis.md` exists and is non-empty
- Tech stack identified (framework, language, build tool)
- Current state assessed (build status, test status)
- File structure mapped (key directories, file counts)
- External dependencies listed

---

## Skip Conditions

- **Fresh project with no code:** Skip this phase entirely, go to `playbooks/discovery.md`
- **Already analyzed recently:** Read existing `.harness/analysis.md`, update only if stale

---

## Next Phase

After analysis is complete, proceed to `playbooks/discovery.md` for user needs discovery.
