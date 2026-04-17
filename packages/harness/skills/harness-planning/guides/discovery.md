# Phase 2: Discover User Needs

## Mission

Understand what the user wants to build through structured questions. Capture goals, constraints, priorities, and non-functional requirements.

**Input:** `.harness/analysis.md` (if exists — from Phase 1)
**Output:** `.harness/requirements.md`

---

## Discovery Framework

Ask questions in this order. Adapt based on project type (fresh vs existing).

### Question 1: Project Vision

**Ask:** "What is this project? What problem does it solve, and for whom?"

**Capture:**
```markdown
## Vision
- **What:** [Product/tool/service description]
- **Who:** [Target users/audience]
- **Why:** [Problem being solved]
- **Success looks like:** [Measurable outcome]
```

**If user is vague:** Push for specifics. "A todo app" → "A collaborative todo app for small teams with real-time sync and deadline reminders?"

---

### Question 2: Core Features

**Ask:** "What are the 3-5 most important features? Rank them by priority."

**Capture as ranked list:**
```markdown
## Core Features (Priority Order)
1. **[Feature]** — [One-line description] — MUST HAVE
2. **[Feature]** — [One-line description] — MUST HAVE
3. **[Feature]** — [One-line description] — MUST HAVE
4. **[Feature]** — [One-line description] — SHOULD HAVE
5. **[Feature]** — [One-line description] — NICE TO HAVE
```

**Push back if >7 features listed as "must have."** Real priorities require trade-offs.

---

### Question 3: User Flows

**Ask:** "Walk me through the main user journey. What does a user do from start to finish?"

**Capture as flow:**
```markdown
## Primary User Flow
1. User lands on [page] → sees [what]
2. User [action] → system [response]
3. User [action] → navigates to [page]
4. ...

## Secondary Flows
- **Admin flow:** [brief description]
- **Onboarding flow:** [brief description]
```

---

### Question 4: Data & APIs

**Ask:** "What data does this project work with? Are there external APIs or services it needs to talk to?"

**Capture:**
```markdown
## Data Model (High Level)
- **Users** — name, email, role, preferences
- **Projects** — title, description, members, status
- **Tasks** — title, assignee, deadline, status, project

## API Needs
- **Internal API:** REST/GraphQL endpoints for CRUD operations
- **External APIs:**
  - [Service] — [purpose] — [auth method]
  - [Service] — [purpose] — [auth method]

## Data Storage
- **Primary:** PostgreSQL / MongoDB / SQLite
- **Cache:** Redis / None
- **Files:** S3 / Local / None
```

---

### Question 5: Constraints & Non-Functional Requirements

**Ask:** "Are there any hard constraints? Performance targets? Security requirements? Deadline?"

**Capture:**
```markdown
## Constraints
- **Must use:** [specific technology/framework/library]
- **Cannot change:** [existing code/schema/API]
- **Deadline:** [date or "no hard deadline"]
- **Budget:** [relevant if using paid APIs/services]

## Non-Functional Requirements
- **Performance:** [page load < 2s, API response < 200ms, etc.]
- **Security:** [auth required, data encryption, RBAC, etc.]
- **Accessibility:** [WCAG level, screen reader support, etc.]
- **Scale:** [expected users, data volume, concurrent requests]
- **Browser/Platform:** [Chrome/Firefox/Safari, iOS/Android, etc.]
```

---

### Question 6: Style & UX Preferences

**Ask:** "Any preferences for visual style, design system, or UX patterns?"

**Capture:**
```markdown
## Style Preferences
- **Visual:** Minimal / Bold / Corporate / Playful / Dark
- **Design System:** Existing / Tailwind / Material / Custom
- **Reference Apps:** [apps they like the feel of]
- **Brand Colors:** [if any]
```

*Skip for backend/API-only projects.*

---

### Question 7: What's Already Done

**Ask:** "What work has already been completed? What can we build on?"

*If Phase 1 was done, present the analysis findings and ask for corrections.*

**Capture:**
```markdown
## Completed Work
- [x] Project setup and configuration
- [x] Authentication system
- [x] Database schema (v1)
- [ ] API endpoints (5/10 done)
- [ ] Frontend pages (2/8 done)
- [ ] Tests (minimal)
```

---

## Synthesize Requirements

After all questions, write `.harness/requirements.md`:

```markdown
# Project Requirements

## Vision
[From Q1]

## Core Features
[From Q2 — prioritized]

## User Flows
[From Q3]

## Data & APIs
[From Q4]

## Constraints
[From Q5]

## Style Preferences
[From Q6 — if applicable]

## Current State
[From Q7 + analysis.md]

## Facts
Known truths that constrain planning:

- FACT: [Tech stack is X — cannot change]
- FACT: [Database schema is frozen — extend only]
- FACT: [Auth uses Y — all endpoints must use it]
- FACT: [Users expect Z — non-negotiable UX requirement]
- FACT: [API X requires key — must be configured before use]

## Open Questions
Things we don't know yet that may affect planning:

- [ ] [Question about scope/requirement]
- [ ] [Question about external dependency]
- [ ] [Question about deployment target]
```

---

## Facts Extraction

Facts are **known truths** about the project. They prevent bad assumptions during planning.

### Sources of Facts

| Source | Example Facts |
|--------|---------------|
| Tech stack | "App uses React 19 with TypeScript strict mode" |
| Existing code | "Auth middleware is at src/auth/middleware.ts" |
| User statements | "Must support offline mode" |
| External constraints | "Stripe API requires webhook endpoint" |
| Data model | "Users have many Projects, Projects have many Tasks" |
| Environment | "Deployed on Vercel, serverless functions only" |

### Fact Format

```markdown
- FACT: [statement] — Source: [where this was learned]
```

**Good facts:**
```markdown
- FACT: App uses Next.js 15 App Router — Source: package.json
- FACT: Auth is handled by Clerk — Source: user statement
- FACT: Database is Supabase PostgreSQL — Source: .env.example
- FACT: Max 100 concurrent users expected — Source: user estimate
```

**Bad facts (too vague):**
```markdown
- FACT: App should be fast        ← Not measurable
- FACT: Code should be clean      ← Not actionable
- FACT: Users want a good UX      ← Not specific
```

---

## Success Criteria

- `.harness/requirements.md` exists and covers all 7 areas
- Core features are prioritized (not all "must have")
- At least 3 concrete facts documented
- Open questions identified (things we don't know)
- User has confirmed requirements are accurate

---

## Adapting to Project Type

### Fresh Project (No Code)
- Skip Q7 (nothing done yet)
- Focus heavily on Q1-Q4
- All facts come from user statements

### Existing Project (Code Exists)
- Present analysis.md findings in Q7
- Validate tech stack facts from code
- Focus on Q2 (what's left) and Q5 (constraints)

### Adding Features to Complete App
- Brief Q1 (vision already established)
- Focus on new feature requirements (Q2)
- Heavy emphasis on Q5 (don't break existing)

---

## Next Phase

After requirements are captured, proceed to `playbooks/architect.md` to create the plan.
