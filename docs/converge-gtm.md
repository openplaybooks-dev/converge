# Converge: Product Positioning & Go-To-Market Plan

**Status**: Internal strategy document — April 2026
**Audience**: Founders, advisors, early contributors

---

## Strategic Premise

Three principles drive every decision in this document:

1. **OSS as primitive — fail fast.** Open-sourcing is not the business. It's the fastest way to validate whether the convergence paradigm resonates. Ship the framework, measure adoption signals within 30 days, and use the data to decide what to build next. If the paradigm doesn't land, pivot early. Don't invest in community-building infrastructure before the core idea is proven.

2. **Target business users, not individual developers.** Individual devs explore frameworks for fun and move on. Businesses have repeatable workflows, pay for solutions, and stick with tools that work. The customer segments are: solo entrepreneurs automating their business, small teams (2-15) scaling delivery, and companies standardizing AI workflows across departments.

3. **Revenue follows value — playbooks, cloud, enterprise.** The OSS framework creates demand. Enterprise playbooks, Converge Cloud (dashboard + shared intelligence), and enterprise licenses capture it. Every GTM activity should generate signal about what businesses will pay for.

---

## Table of Contents

1. [Product Positioning](#1-product-positioning)
2. [Name & Branding](#2-name--branding)
3. [Open Source Strategy](#3-open-source-strategy)
4. [Monetization Strategy](#4-monetization-strategy)
5. [Launch Playbook](#5-launch-playbook)
6. [Content Strategy](#6-content-strategy)
7. [Reddit & Community Outreach](#7-reddit--community-outreach)
8. [Video Content Plan](#8-video-content-plan)
9. [Plugin Ecosystem Strategy](#9-plugin-ecosystem-strategy)
10. [Community Building](#10-community-building)
11. [Differentiation Messaging](#11-differentiation-messaging)
12. [Risk Assessment](#12-risk-assessment)
13. [Success Metrics](#13-success-metrics)

---

## 1. Product Positioning

### One-Liner

**"Define done. Converge gets there."**

### Category

Gap-driven convergence framework for AI agent orchestration.

### Positioning Statement

**For** businesses and teams **who** need to automate complex, multi-step workflows with AI agents that reliably deliver verified outcomes, **Converge is** a gap-driven convergence framework **that** continuously measures the distance between current state and target state, self-corrects through structured feedback loops, and converges on completion — without requiring you to define how to get there. **Unlike** LangGraph (graph-based), CrewAI (role-based), AutoGen (conversation-based), and OpenHands (step-based), Converge is the only framework where you declare what "done" looks like and the system figures out the rest.

### What Converge IS

- A convergence engine: define target state, let AI close the gap
- A task orchestration framework with hierarchical nesting (Project > Epic > Task > Subtask — infinite depth)
- A self-correcting system: LEARN.md carries failure analysis forward between attempts
- A filesystem-first framework: `ls` and `cat` are your debugger
- A TypeScript-native framework built for the Claude Code ecosystem
- A multi-provider framework: Claude, Gemini, Kimi, Qwen via the `agentfn` abstraction
- 270 lines of core logic (Unit class) with 92% test coverage
- A business tool — built to automate real workflows that generate real revenue

### What Converge IS NOT

- Not a chatbot framework or conversational agent system
- Not a RAG pipeline or retrieval framework
- Not a prompt engineering library
- Not a Python framework with a TypeScript wrapper
- Not an LLM wrapper — it orchestrates agents, not model calls
- Not a hobby project — it's a product with a commercial roadmap

### Target Users

**Tier 1: Solo Entrepreneurs**
- One-person businesses automating workflows they currently do manually or with contractors
- Use cases: content production, client deliverable generation, data processing, research reports, automated audits
- Pain: they're the bottleneck — every hour spent on repeatable work is an hour not spent on growth
- Willingness to pay: $50-200/month for tools that save them 10+ hours/week
- How they find tools: Twitter/X, Reddit (r/SideProject, r/Entrepreneur), indie hacker communities, Product Hunt
- Key message: "Set up once, run repeatedly. Converge automates your repeatable workflows."

**Tier 2: Small Teams (2-15 people)**
- Dev agencies, consultancies, small SaaS companies, data teams
- Use cases: full-stack app scaffolding, CI/CD pipeline automation, test generation, multi-repo coordination, client project templates
- Pain: knowledge is siloed, onboarding is slow, quality is inconsistent across team members
- Willingness to pay: $200-1K/month for tools that standardize delivery and reduce senior engineer bottlenecks
- How they find tools: team leads evaluate via GitHub, HN, word-of-mouth from other leads
- Key message: "Encode your team's best practices into playbooks. New hires deliver like veterans."

**Tier 3: Companies (15-500+ people)**
- Engineering orgs, data orgs, compliance teams, operations departments
- Use cases: standardized deployment pipelines, compliance document processing, cross-team workflow coordination, security audits at scale
- Pain: AI adoption is chaotic — every team uses different tools, no consistency, no auditability
- Willingness to pay: $5K-50K/year for enterprise features (SSO, audit logs, support SLA, custom playbooks)
- How they find tools: engineering leadership evaluates via internal recommendations, analyst reports, conference talks
- Key message: "AI workflows that are auditable, repeatable, and don't depend on any single engineer's prompt skills."

**De-prioritized: Individual developers exploring frameworks**
- They generate GitHub stars and Reddit posts, not revenue
- They're welcome to use the OSS framework, but the GTM doesn't optimize for them
- If they become paying customers (solo → team → company), great — but don't build for hobbyists

---

## 2. Name & Branding

### "Converge" Analysis

**Pros:**
- Semantically accurate — the framework literally converges on completion
- Memorable, single-word, strong verb
- Distinct from crowded naming patterns: no "agent," "crew," "graph," "chain," "flow," or "gen" in the name
- Works as both noun ("Converge framework") and verb ("let it converge")
- Domain-relevant without being jargon — business users understand "converge" intuitively
- Good search differentiation from LangChain/LangGraph/CrewAI namespace

**Cons:**
- `converge` on npm is taken (last published 8+ years ago, effectively abandoned)
- `converge.run` is taken by an AI platform (different category — they do AI model serving)
- Common English word — potential SEO competition with math/physics/business usage

### npm Strategy

1. **Immediately register**: `@converge` npm org (org names have separate namespace)
2. **Primary package**: `@converge/core` — this is the main framework
3. **Supporting packages**: `@converge/agentfn`, `@converge/cli`, `@converge/plugin-*`
4. **File dispute** for bare `converge` name — npm has a dispute resolution process for abandoned packages (>12 months no publish, no active maintenance). The current `converge` package was last updated years ago.
5. **Fallback**: If dispute fails, `@converge/core` is perfectly viable. Deno, Bun, and modern Node.js all handle scoped packages natively.

### Domain Strategy

| Domain | Status | Notes |
|--------|--------|-------|
| `converge.dev` | **Check first** | Google-managed TLD, ideal for developer tools |
| `useconverge.dev` | Fallback | Pattern used by Zustand (`zustand.dev`), Jotai, etc. |
| `converge.tools` | Fallback | Descriptive, available TLDs tend to be cheaper |
| `getconverge.dev` | Fallback | Common pattern for CLI tools |
| `converge.sh` | Fallback | Good for CLI-first tools, used by Bun (`bun.sh`) |

**Recommendation**: Check `converge.dev` availability first. If taken, go with `useconverge.dev`. The `.dev` TLD signals developer tooling and gets HTTPS by default.

### GitHub Strategy

| Option | Notes |
|--------|-------|
| `converge-framework` | Descriptive, unlikely to be taken |
| `useconverge` | Matches domain pattern if using `useconverge.dev` |
| `converge-dev` | Matches `converge.dev` domain |

**Recommendation**: `useconverge` — short, consistent with domain, works as both org and brand reference.

---

## 3. Open Source Strategy

### Verdict: OSS as Validation Primitive

Open-source is the fastest path to market signal. Not the business model. Not a long-term community play. A validation tool.

**Why OSS first:**
- Every competitor is open-source: LangGraph (MIT), CrewAI (MIT), AutoGen (MIT), OpenHands (MIT). Closed-source is dead on arrival.
- OSS is the fastest way to answer: "Does the convergence paradigm resonate with people who have real workflows to automate?"
- Zero distribution cost. One HN post, a few Reddit threads, and we know within 30 days.
- MIT license maximizes enterprise adoption — no GPL friction, no CLA arguments.

**What OSS is NOT:**
- Not a community-building exercise. Don't invest in Discord moderation, governance models, or contributor programs until the paradigm is validated.
- Not a long-term free tier. The framework stays MIT forever, but commercial features get built on top, not alongside.
- Not a popularity contest. Stars are vanity. The signal that matters: do businesses adopt it for real workflows?

### Fail-Fast Signals (30-Day Gate)

After 30 days of being public, evaluate these signals to decide next steps:

| Signal | Positive | Negative |
|--------|----------|----------|
| npm downloads | >200 weekly, growing | <50 weekly, flat |
| GitHub issues | >10, substantive (bug reports, feature requests from real use cases) | <3, or all "cool project!" without substance |
| Business inquiries | 1+ inbound "can I use this for X?" from a team/company | Zero |
| Playbook interest | People asking for specific domain playbooks | Nobody mentions playbooks |
| Self-correction resonance | LEARN.md / self-correction cited as the key differentiator in discussions | Treated as just another retry mechanism |

**If positive**: Double down. Build Converge Cloud, enterprise playbooks, go-to-market for Tier 2/3 customers.

**If negative**: The paradigm didn't land. Options: pivot the messaging (maybe "convergence" isn't the hook — maybe it's "self-correcting AI workflows"), pivot the audience (maybe the buyer isn't who we think), or shelve and move on. Don't spend 6 months nursing a framework nobody uses.

### What to Include

| Package/Directory | Include | Notes |
|-------------------|---------|-------|
| `packages/harness/` | Yes | Core framework — renamed to `@converge/core` |
| `packages/agentfn/` | Yes | Multi-provider LLM abstraction — renamed to `@converge/agentfn` |
| `packages/claudefn/` | Yes | Claude provider |
| `packages/kimifn/` | Yes | Kimi provider |
| `packages/qwenfn/` | Yes | Qwen provider |
| `packages/geminifn/` | Yes | Gemini provider |
| Tests | Yes | 92% coverage is a selling point |
| Examples | Yes | Create 3-5 standalone examples targeting business use cases |
| Skills | Yes | Example SKILL.md files |
| CLI (`harness` command) | Yes | Renamed to `converge` |
| Docs | Yes | README, architecture docs, API reference |

### What to Exclude

| Package/Directory | Reason |
|-------------------|--------|
| `apps/` (SheetsRun app) | Commercial product, not part of the framework |
| `packages/sheets-*` | SheetsRun-specific, Google Sheets integration |
| `packages/stitch-*` | SheetsRun-specific, UI generation pipeline |
| `packages/claude-web-api/` | Unofficial API wrapper, potential ToS issues |
| `.env`, credentials, API keys | Obviously |
| `artifacts/` | SheetsRun project artifacts |
| Internal playbooks referencing SheetsRun | Commercial context |

### Pre-OSS Cleanup Checklist

**Code Rename (harness → converge)**
- [ ] Rename `packages/harness/` → `packages/core/`
- [ ] Update `package.json`: name `harness` → `@converge/core`
- [ ] Update `package.json`: bin `harness` → `converge`
- [ ] Rename `@crew/agentfn` → `@converge/agentfn`
- [ ] Rename `@crew/claudefn` → `@converge/claudefn` (and all providers)
- [ ] Update all import paths: `from 'harness'` → `from '@converge/core'`
- [ ] Update all import paths: `from '@crew/*'` → `from '@converge/*'`
- [ ] Rename `defineHarness()` → `defineConverge()` (keep `defineHarness` as deprecated alias)
- [ ] Rename `.harness/` convention → `.converge/` (keep `.harness/` as fallback)
- [ ] Update CLI commands: `harness run` → `converge run`
- [ ] Update all README references
- [ ] Update `harness.ts` config filename → `converge.ts`

**Repository Setup**
- [ ] Create new GitHub repo under chosen org
- [ ] Extract packages to standalone repo with clean git history (`git filter-repo` or fresh init)
- [ ] Verify no SheetsRun references remain: `grep -r "sheetsrun\|SheetsRun\|sheets-run\|sheets_run" .`
- [ ] Verify no credentials: `grep -r "sk-\|ANTHROPIC_API_KEY\|GOOGLE_API_KEY" .`
- [ ] Verify no internal URLs or private references
- [ ] Set up branch protection on `main`

**Documentation**
- [ ] Write root `README.md` (adapt from existing `packages/harness/README.md` — already near-publication quality)
- [ ] Write `CONTRIBUTING.md` — keep minimal, don't over-invest before validation
- [ ] Create `LICENSE` file (MIT)
- [ ] Write `CHANGELOG.md` starting from v0.1.0
- [ ] Create `.github/ISSUE_TEMPLATE/` (bug report, feature request)

**CI/CD**
- [ ] GitHub Actions: lint, typecheck, test on push/PR
- [ ] GitHub Actions: auto-publish to npm on tagged release
- [ ] Set up Codecov or similar for coverage badge

**Examples (Business-Oriented)**
- [ ] Example 1: "Client Deliverable Pipeline" — multi-step report generation with quality checks
- [ ] Example 2: "Full-Stack App Scaffold" — multi-epic project with WBS
- [ ] Example 3: "Data Pipeline" — ETL with schema validation checks
- [ ] Example 4: "Compliance Audit" — document processing with regulatory checks
- [ ] Example 5: "Content Production" — batch content with SEO/quality verification

**Final Audit**
- [ ] Run `npm pack --dry-run` and inspect the tarball contents
- [ ] Verify all tests pass: `npm test`
- [ ] Verify TypeScript compiles cleanly: `tsc --noEmit`
- [ ] Verify the CLI works: `npx @converge/core run --dry`
- [ ] Have 2-3 external reviewers test the Quick Start from scratch

---

## 4. Monetization Strategy

### Principle: The Framework is Free. The Expertise is the Product.

The OSS framework creates demand. Commercial layers capture it. Each tier feeds the next.

### Revenue Ladder

```
OSS Framework (free)
    ↓ creates demand for
Enterprise Playbooks ($500-5K/year)
    ↓ creates demand for
Converge Cloud ($50-200/team/month)
    ↓ creates demand for
Enterprise License ($10-50K/year)
```

### Tier 1: Consulting & Implementation (Month 0-6)

**What**: Hands-on help applying Converge to a customer's specific workflows.

**Target**: Solo entrepreneurs and small teams who discover Converge through OSS and want help setting it up.

| Offering | Price | Deliverable |
|----------|-------|-------------|
| "Quick Start" session | $500 | 2-hour call: map their workflow to Converge, build first playbook together |
| Workflow implementation | $2-5K | Full playbook for one business workflow (content pipeline, client deliverable, data processing) |
| Ongoing advisory | $1-2K/month | Weekly check-in, playbook iterations, priority support |

**Why this first**: Zero build cost. Every engagement teaches us what business users actually need. The patterns from consulting become the enterprise playbooks.

**Fail-fast gate**: If nobody converts from OSS → consulting inquiry within 60 days, the business user thesis is wrong.

### Tier 2: Enterprise Playbooks (Month 3-12)

**What**: Production-ready, tested, maintained playbook packages for specific business domains.

**Target**: Teams and companies that want pre-built workflows, not DIY.

| Playbook | Target Buyer | Price |
|----------|-------------|-------|
| `@converge/playbook-fullstack` | Dev agencies, SaaS teams | $500-1K/year |
| `@converge/playbook-compliance` | Legal, finance, regulated industries | $2-5K/year |
| `@converge/playbook-data-pipeline` | Data teams, analytics companies | $1-3K/year |
| `@converge/playbook-content-production` | Marketing teams, content agencies | $1-2K/year |
| `@converge/playbook-security-audit` | Security teams, consultancies | $2-5K/year |

**Why playbooks work for Converge specifically**: Playbooks are already a first-class framework concept. The `playbook.yml` format, input variables, dependency graphs — all built. Enterprise playbooks are just better, battle-tested versions with support and maintenance.

**Business model**: MIT framework + proprietary playbooks. This is the Red Hat model — the engine is free, the certified configurations are paid.

**What makes a playbook worth paying for vs. DIY**:
- Pre-built, tested on real projects, not just examples
- Includes domain-specific SKILL.md files with expert knowledge encoded
- Includes check suites that catch real-world edge cases
- Maintained: updated for new LLM capabilities, framework versions
- Comes with example LEARN.md files showing common failure patterns and fixes

### Tier 3: Converge Cloud (Month 6-12)

**What**: A thin managed layer on top of the OSS framework. NOT an AI platform.

**Target**: Teams that need visibility, collaboration, and shared intelligence across workflows.

| Feature | Value |
|---------|-------|
| **Convergence Dashboard** | Web UI for `converge status` across all projects — real-time gap detection, task progress, convergence scores |
| **Shared LEARN.md Corpus** | Anonymized failure patterns from opt-in users. "Your task failed the same way 47 other teams' did — here's the fix." Gets better with scale. |
| **Team Playbook Library** | Shared playbooks across team members, version-controlled, role-based access |
| **Run History & Analytics** | How long do workflows take? Where do they fail most? Which playbooks have the best success rate? |
| **Alerts & Notifications** | Slack/email when a workflow fails, converges, or needs human input |

**Price**: $50-200/team/month. Low enough to be expensable without procurement approval.

**What this is NOT**: Not a hosted execution environment. Users run Converge locally or in their own CI. Converge Cloud is visibility and intelligence, not compute. We don't touch their API keys, don't run their LLM calls, don't store their code.

**Why this is defensible**: The shared LEARN.md corpus is a network effect. Every user who opts in makes the system smarter for every other user. Competitors can copy the framework but not the failure intelligence database.

### Tier 4: Enterprise License (Month 12+)

**What**: Full enterprise package for companies with compliance, security, and support needs.

**Target**: Companies with 50+ engineers using Converge across teams.

| Feature | Notes |
|---------|-------|
| SSO/SAML integration | Required for enterprise procurement |
| Audit logging | Every task run, every check result, every LEARN.md — searchable, exportable |
| Priority support SLA | 4-hour response for critical issues |
| Custom playbook development | We build domain-specific playbooks for their workflows |
| On-premise deployment | Converge Cloud running on their infrastructure |
| Training & onboarding | Team workshops, playbook authoring training |

**Price**: $10-50K/year depending on company size and scope.

### What NOT to Build

- **An AI platform / hosted execution**: Competing with Anthropic, OpenAI, Google on infrastructure is a losing game. We're the orchestration layer, not the compute layer. We're Terraform, not AWS.
- **A free cloud tier**: Free tiers attract tire-kickers, not buyers. The OSS framework IS the free tier.
- **A marketplace**: Don't build a skill marketplace until there's a community large enough to supply it. Month 6+ at the earliest.

---

## 5. Launch Playbook

### Pre-Launch (4 Weeks Before)

**Week 1: Infrastructure**
- Register `@converge` npm org
- Register domain (check `converge.dev` first)
- Create GitHub org and repo
- Set up GitHub Actions CI pipeline
- Configure npm publish workflow
- Set up a simple landing page (one-page, framework pitch + Quick Start + link to GitHub)

**Week 2: Content Preparation**
- Write "Why We Built Converge" blog post (see Section 6, Tier 1)
- Record 5-minute demo video (see Section 8, Priority 1)
- Build comparison table landing page content
- Draft Reddit posts for each target subreddit (see Section 7)
- Draft Hacker News "Show HN" post
- Prepare Twitter/X launch thread (8-10 tweets)
- Write one business-oriented case study: "How Converge Automates a Client Deliverable Pipeline"

**Week 3: Beta Testing**
- Invite 10-20 beta testers — prioritize people with real business workflows to automate, not framework tourists
- Recruit from: r/ClaudeCode, Claude Code Discord, Twitter/X AI dev community, indie hacker communities
- Criteria: must attempt the Quick Start from scratch AND apply it to one of their own workflows
- Collect and fix all onboarding friction points
- Get 3-5 testimonial quotes — especially from anyone who used it for a real business task

**Week 4: Final Polish**
- Apply all beta feedback
- Final pass on README and docs
- Tag 5-10 GitHub issues as `good-first-issue`
- Prepare monitoring dashboard: GitHub stars, npm downloads, HN rank
- Set up tracking for consulting inquiry funnel (landing page → GitHub → contact)
- Stage all content for coordinated release

### Launch Day

**Morning (8-9am PT)**
- `npm publish` — push `@converge/core@0.1.0` and all packages to npm
- Flip GitHub repo to public
- Push all documentation, examples, CI config
- Verify Quick Start works: `npx @converge/core --help`
- Deploy landing page

**Mid-Morning (10am PT)**
- Post "Show HN: Converge — Define done, AI converges on completion" to Hacker News
  - Keep the post factual, technical, and honest
  - Include: what it does, the paradigm difference, a code example, and the link
  - Be available to respond to every comment within 60 minutes

**Late Morning (11am-Noon PT)**
- Post to r/ClaudeCode (primary)
- Post to r/LocalLLaMA (multi-provider angle)
- Do NOT cross-post — write unique, subreddit-appropriate content for each

**Afternoon (1-3pm PT)**
- Publish blog post ("Why We Built Converge")
- Post Twitter/X thread
- Share in relevant Discord servers (Claude Code, TypeScript, AI dev communities)

**Evening**
- Monitor all channels, respond to every comment, issue, and question
- Track metrics: stars, downloads, upvotes, comments
- Fix any reported installation or Quick Start issues immediately

### Post-Launch (30 Days) — Validation Sprint

The goal of the first 30 days is not community building. It's signal collection.

**Week 1 (Days 1-7)**
- Respond to every GitHub issue within 24 hours
- Publish "Day 1 Retrospective" blog post with real numbers
- Fix all reported bugs immediately
- Post to r/ClaudeAI, r/programming (staggered)
- **Signal collection**: Track every comment, issue, and DM for business use case mentions. Categorize: solo/team/company, domain, specific workflow.

**Week 2 (Days 8-14)**
- Publish "Speed Run" video: full React app built with Converge
- Publish architecture walkthrough blog post
- **Active outreach**: DM 5-10 people who posted substantive comments/issues — ask them what they're building, what's missing, would they pay for playbooks
- Post case study to r/SideProject with business-outcome angle

**Week 3 (Days 15-21)**
- Publish "LEARN.md: How AI Self-Correction Works" deep dive
- **30-day signal review preparation**: compile all business inquiries, use case mentions, playbook requests
- Review and merge first external PRs
- If consulting inquiries exist: schedule first paid engagement

**Week 4 (Days 22-30)**
- **30-Day Gate Review**: Evaluate fail-fast signals (see Section 3). Make go/no-go decision on commercial investment.
- If go: begin Converge Cloud design, start building first enterprise playbook
- If no-go: document learnings, decide on pivot or shelve
- Write retrospective: what worked, what didn't, 30-day numbers, business signals received

---

## 6. Content Strategy (Priority-Ordered)

### Tier 1: Launch Content (Day 0)

| Content | Format | Purpose |
|---------|--------|---------|
| "Why We Built Converge" | Blog post (1500-2000 words) | Origin story through a business lens: real workflows that failed with other tools, why convergence solves it |
| "Converge in 5 Minutes" | Video (5 min) | Quick demo: install, create a task, run it, watch self-correction happen |
| Comparison table | Landing page section | Honest feature comparison vs. LangGraph, CrewAI, OpenHands, OpenAI Agents SDK, Google ADK |
| Quick Start tutorial | README + docs | Install → first task → first run → understand the output |
| "Automating Client Deliverables with Converge" | Case study / blog post (1000 words) | Business-focused: show a real workflow (report generation, content pipeline) end to end |

**"Why We Built Converge" outline:**
1. The problem: building complex AI workflows reliably is still unsolved. Existing frameworks require you to be an AI engineer.
2. Who cares: businesses that need repeatable, verifiable AI workflows — not researchers experimenting.
3. What we tried: LangGraph (too graph-heavy, requires engineering), CrewAI (role abstraction doesn't map to real business workflows), vanilla Claude Code (loses context, no verification).
4. The insight: every business workflow is gap-closing. Define the target state (deliverable exists, quality checks pass), measure gaps, close them iteratively.
5. How it works: 3-layer architecture, LEARN.md self-correction, filesystem-as-plan.
6. Who it's for: solo operators automating repeatable work, teams encoding best practices into playbooks, companies standardizing AI across departments.

### Tier 2: Momentum Content (Days 1-30)

| Content | Format | Purpose |
|---------|--------|---------|
| "How LEARN.md Makes AI Self-Correcting" | Blog post (2000 words) | Deep dive into the self-correction loop, business impact: fewer failed runs = less wasted API spend |
| "270 Lines of Core Logic" | Blog + video (10 min) | Architecture walkthrough — trust signal for technical evaluators at teams/companies |
| "From Solo Workflow to Team Playbook" | Tutorial (1500 words) | Show how a solo operator's workflow becomes a team-shared playbook |
| Speed-run video | Video (15-20 min) | Build a full React app from scratch using only Converge |
| "The Real Cost of Failed AI Runs" | Blog post (1000 words) | Business angle: API costs, wasted time, context-switching. Position self-correction as ROI. |

### Tier 3: Growth Content (Days 30-90)

| Content | Format | Purpose |
|---------|--------|---------|
| Domain-specific playbook guides | Blog series | One post per domain: content production, data pipelines, compliance, app scaffolding |
| "Converge for Teams: Encoding Best Practices" | Blog post | How teams use playbooks + skills to standardize delivery quality |
| Claude Code plugin integration | Blog post + code | Using Converge as a Claude Code skill |
| Production failure stories | Blog post | Real examples where self-correction saved a workflow (warts and all) |
| "Multi-Provider Guide: Choosing the Right LLM per Task" | Blog post | Business decision: when to use Claude vs. Gemini vs. Qwen for cost/quality tradeoffs |
| "Converge vs. Hiring Another Developer" | Blog post | Provocative but honest: where Converge replaces manual work, where it doesn't |

---

## 7. Reddit & Community Outreach

### Target Subreddits

| Subreddit | Members | Angle | Timing |
|-----------|---------|-------|--------|
| r/ClaudeCode | ~96K | Primary technical audience. Framework launch. | Launch day |
| r/LocalLLaMA | ~671K | Multi-provider angle. Cost-conscious teams. | Launch day (different post) |
| r/ClaudeAI | ~688K | Broader Claude audience. Business workflow angle. | Day 3-5 |
| r/SideProject | varies | Solo entrepreneur angle. "I automated my business workflow." | Day 7-10 |
| r/programming | varies | Technical depth. Architecture deep-dive. | Day 14-21 |
| r/Entrepreneur | varies | Business automation angle. Non-technical framing. | Day 21-30 |

### Tone Rules

- **Zero marketing language.** No "revolutionary," "game-changing," "next-generation." Developers and business people alike see through this.
- **Technical specifics.** "270 lines of core logic," "92% test coverage," "MIT licensed." Numbers build credibility.
- **Personal voice.** "I built..." not "We're excited to announce..."
- **Business outcomes over features.** "Saved me 10 hours/week on client reports" > "supports hierarchical task nesting."
- **Include failure cases.** "Here's where it struggles" builds more trust than "it's amazing at everything."
- **Respond to every comment.** Even negative ones. Especially negative ones.

### Post Templates

**r/ClaudeCode (Launch Day)**

> **Title**: I built a convergence framework for orchestrating complex Claude Code workflows
>
> I've been building complex AI projects (full-stack apps, data pipelines, client deliverables) and kept hitting the same wall: Claude Code is incredible for single tasks but loses coherence on multi-step projects. Tasks get skipped, context drifts, there's no way to verify the output actually meets requirements.
>
> So I built Converge — a different approach to agent orchestration. Instead of defining steps (like LangGraph) or roles (like CrewAI), you define what "done" looks like. Converge continuously detects gaps between current state and target state, generates work to close them, and self-corrects when things fail.
>
> The self-correction is the interesting part. When a task fails a check, the framework writes a LEARN.md analyzing exactly what went wrong. On the next attempt, the agent reads LEARN.md first and applies targeted corrections. It's not "retry and hope" — it's structured learning between attempts.
>
> Some numbers:
> - Core logic: 270 lines (Unit class)
> - Test coverage: 92%
> - License: MIT
> - Providers: Claude, Gemini, Kimi, Qwen via agentfn abstraction
> - TypeScript-native, works as a Claude Code skill
>
> Quick start: `npm install @converge/core`
>
> GitHub: [link]
>
> I'm using it to automate client deliverable pipelines, content production, and full-stack scaffolding. If you're doing anything with multi-step AI workflows, I'd like to hear what you're building and whether this could help.
>
> Happy to answer questions. This is early (v0.1.0) and rough edges exist.

**r/SideProject (Week 1-2)**

> **Title**: I built a framework that automates my repeatable business workflows with AI agents
>
> I run a solo operation and kept burning time on the same types of work: generating client reports, scaffolding project templates, processing data through multi-step pipelines. Claude Code is great for one-off tasks, but when I need a 12-step workflow where each step verifies the last? It falls apart.
>
> So I built Converge. The idea: define what "done" looks like for each step (files that exist, quality checks that pass), and the framework keeps running until everything converges on completion. If something fails, it writes an analysis of what went wrong and corrects itself on the next attempt.
>
> I now have playbooks for my most common workflows. Set up once, run repeatedly with different inputs. A content production workflow that took me 4 hours per piece now runs autonomously with quality checks.
>
> It's open-source (MIT), TypeScript, works with Claude/Gemini/Kimi/Qwen.
>
> [link]
>
> Curious: what repeatable workflows are eating your time?

**r/Entrepreneur (Week 3-4)**

> **Title**: How I'm using AI agents to automate repeatable work in my business
>
> I've been experimenting with using AI agents for actual business workflows — not chatbots or content generation, but structured multi-step processes: client deliverable pipelines, data processing, compliance checks.
>
> The problem with most AI tools: they're unreliable on anything beyond a single task. Ask an AI to do a 10-step workflow and it'll nail 7 steps and hallucinate the other 3.
>
> I built a framework called Converge that solves this differently. Instead of telling AI "do step 1, then step 2, then step 3," you define what the finished product looks like. What files need to exist, what quality checks need to pass. The framework runs, checks its own work, and self-corrects when something fails.
>
> It's not magic — you need to define clear success criteria. But once you have that, the same workflow runs reliably every time.
>
> Open-source, free: [link]
>
> Building paid playbooks for specific business domains (content, compliance, data) if there's interest.

### Posting Rules

- Stagger posts 24-48 hours apart across subreddits. Never cross-post.
- Each subreddit gets unique content tailored to that community's interests and vocabulary.
- Don't post the same day on more than 2 subreddits.
- Monitor comments for 48 hours after each post.
- If a post doesn't gain traction, don't delete it — let it exist. Don't re-post.
- **Track business signals**: every comment that mentions a specific workflow, team size, or willingness to pay gets logged.

### What Goes Viral on Reddit

- **GIFs of real task execution.** Terminal recording showing tasks running, self-correcting, and completing. 30-60 seconds.
- **Before/after comparisons.** "Here's the same project with vanilla Claude Code (failed after step 3) vs. Converge (completed all 12 tasks)."
- **Business outcomes.** "This workflow used to take me 4 hours. Now it runs in 12 minutes." Real numbers from real work.
- **Honest head-to-head comparisons.** "I ran the same task on LangGraph and Converge. Here's what happened." Include where Converge loses.
- **Architecture deep-dives with code.** "Here's the entire convergence loop in 40 lines." Include the actual code.

---

## 8. Video Content Plan

### Priority 1: "Converge in 5 Minutes" (Launch Day)

- **Length**: 5 minutes
- **Platform**: YouTube (primary), Twitter/X clip (60 sec hook)
- **Content**:
  - 0:00 — Problem statement (30 sec): "AI agents are powerful but unreliable on multi-step workflows"
  - 0:30 — Install and first task (90 sec): `npm install`, create a SKILL.md, run `converge run`
  - 2:00 — Watch it work (90 sec): terminal output showing gap detection, execution, verification
  - 3:30 — Self-correction demo (60 sec): intentionally break a check, show LEARN.md generation, successful retry
  - 4:30 — Wrap-up (30 sec): what to try next, link to docs
- **Format**: Screen recording, terminal visible, voice-over narration

### Priority 2: "Automating a Business Workflow End-to-End" (Week 1)

- **Length**: 10-15 minutes
- **Platform**: YouTube
- **Content**: Take a real business workflow (client report generation, content pipeline) from zero to automated playbook. Show: defining the target state, writing checks, running it, watching self-correction, running it again with different inputs.
- **Key message**: "Set up once, run repeatedly." This is the video for solo entrepreneurs and team leads.

### Priority 3: "Speed Run: Full React App with AI Agents" (Week 2)

- **Length**: 15-20 minutes
- **Platform**: YouTube
- **Content**: Define epics (data modeling, API, frontend, tests) → run `converge run` → watch the entire build happen autonomously → show the running app
- **Key moment**: Show a real self-correction where tests fail and the framework fixes the code

### Priority 4: "Architecture Walkthrough: 270 LoC Core" (Week 3)

- **Length**: 10 minutes
- **Platform**: YouTube
- **Content**: Walk through `unit.ts` line by line. Explain the convergence loop, gap detection, check resolution. Show how one class handles all levels (Project/Epic/Task/Subtask).
- **Why this works**: Technical evaluators at companies need to trust the foundation. "270 lines" is a hook.

### Priority 5: "Converge for Teams: From Solo Workflow to Shared Playbook" (Week 4)

- **Length**: 12 minutes
- **Platform**: YouTube
- **Content**: Take a workflow one person built, show how it becomes a parameterized playbook, show a second team member running it with different inputs.
- **Key message**: Teams buy tools. This video is for the team lead evaluating whether to adopt.

### Production Notes

- Screen recordings with terminal prominently visible
- Show failures and self-correction — don't edit them out
- Voice-over only (no face cam needed)
- Create 45-60 second hook clips from each video for Twitter/X and Reddit
- Use `asciinema` or similar for terminal recordings where GIF quality matters
- Business outcome framing in titles and descriptions, not just technical framing

---

## 9. Plugin Ecosystem Strategy

### Claude Code Skill

Converge should be invocable as a Claude Code skill. Create a `SKILL.md` that registers `@converge` as a skill command within Claude Code sessions.

```markdown
---
name: converge
description: Run Converge convergence framework for complex multi-step AI workflows
---

Run the Converge framework to orchestrate tasks, detect gaps, and self-correct.

Usage within Claude Code:
- `/converge run` — execute all pending tasks
- `/converge status` — show convergence progress
- `/converge run --step` — execute one task
```

This gives Claude Code users access to Converge without leaving their existing workflow. The skill format is already compatible with the Claude Code skill system.

### MCP Server

Expose Converge capabilities as an MCP (Model Context Protocol) server:

**Resources (read-only context):**
- `converge://project/status` — current project convergence state
- `converge://tasks/{id}/gaps` — gaps for a specific task
- `converge://tasks/{id}/learn` — latest LEARN.md content
- `converge://journal/{taskId}` — full journal for a task

**Tools (executable actions):**
- `converge_run` — trigger a convergence run
- `converge_run_step` — run a single task
- `converge_detect_gaps` — scan for gaps without executing
- `converge_reset` — reset a specific task checkpoint

**Why MCP matters**: 97M monthly MCP SDK downloads. Every Claude Code user has MCP access. Making Converge an MCP server means any MCP-compatible client (Claude Desktop, Claude Code, third-party tools) can use it.

### Skills Portability

The SKILL.md format is already compatible with:
- Claude Code skill system (direct invocation)
- Converge's own task system (declarative task definition)
- Any LLM that can read markdown (universal portability)

No proprietary skill format needed. SKILL.md is markdown + YAML frontmatter — the most portable format possible.

### Skills Roadmap

**Month 1-3: Official Skills (Business-Oriented)**
- `client-deliverable` — multi-step report/document generation with quality checks
- `content-production` — batch content creation with SEO/readability verification
- `code-gen` — generate code from specifications with type-checking verification
- `test-gen` — generate test suites from existing code with coverage checks
- `data-pipeline` — ETL with schema validation and row-count checks
- `compliance-audit` — document processing with regulatory completeness checks
- `security-audit` — OWASP top-10 audit with structured findings

**Month 3-6: Community Skills Repository (Only if validation signals are positive)**
- Create `converge-skills` GitHub repository
- Accept community-contributed skills via PR
- Skills must include: SKILL.md, at least one example, at least one check
- Automated CI validates skill format

**Month 6+: Curated Index (Only if community exists)**
- Searchable index of community skills
- Quality tiers: official, verified, community
- Usage metrics per skill
- One-command install: `converge skill add @community/skill-name`

---

## 10. Community Building

### Principle: Community Follows Product-Market Fit, Not the Reverse

Don't invest in heavy community infrastructure before the paradigm is validated. Discord servers, governance models, and contributor programs are expensive to maintain and demoralizing when empty.

### Phase 1: Minimal Viable Community (Month 0-3)

**GitHub only.** No Discord yet.

- GitHub Issues for bugs and feature requests
- GitHub Discussions for Q&A and show-and-tell
- Tag 5-10 issues as `good-first-issue` before launch
- Respond to every issue within 24 hours, every PR within 48 hours
- That's it. Don't build more until there's demand.

**Why no Discord at launch**: Discord servers for small OSS projects are ghost towns. A ghost town is worse than no Discord. When GitHub Discussions consistently overflow (>50 active threads), that's the signal to launch Discord.

### Phase 2: Active Community (Month 3-6, only if validation passes)

**Launch Discord when GitHub Discussions prove demand.**

| Channel | Purpose |
|---------|---------|
| `#announcements` | Releases, blog posts, major updates (mod-only posting) |
| `#general` | Open discussion |
| `#help` | Support questions |
| `#showcase` | Users share what they've built — emphasis on business outcomes, not toy projects |
| `#playbooks` | Share and discuss playbook configurations |
| `#enterprise` | Private channel for paying customers |

### Phase 3: Governance (Month 6+, only if there are contributors)

**Don't build governance before there are people to govern.**

- `CONTRIBUTING.md` with clear guidelines exists from day 1 — minimal, not elaborate
- RFC process via GitHub Discussions when there are 5+ regular contributors
- Core maintainer invitations when individuals demonstrate sustained quality contributions
- No formal governance model until there are 10+ active contributors. Before that, BDFL is the only model that makes sense.

### GitHub Organization

**Issues (bugs & features only):**
- Bug reports: template with reproduction steps, expected vs. actual, environment
- Feature requests: template with use case, proposed API, alternatives considered
- Keep issues focused

**Discussions:**
- Category: Q&A — technical support
- Category: Show & Tell — users share projects and outcomes
- Category: Ideas — propose new features and playbooks
- Category: Business Use Cases — specifically for people sharing how they use Converge for business workflows (critical signal collection channel)

**Good First Issues:**
- Tag 5-10 issues as `good-first-issue` before launch
- Types: documentation improvements, additional test cases, error message improvements, small feature additions
- Each must include: clear description, file pointers, expected behavior, acceptance criteria

---

## 11. Differentiation Messaging

### Core Narrative

> Every other framework starts with **HOW** — steps to take, graphs to traverse, roles to play.
>
> Converge starts with **WHAT** — what does done look like?
>
> Define the target state. Converge closes the gap.

### The SQL Analogy

SQL describes **what data you want**, not how to get it. The query optimizer figures out the execution plan.

Converge describes **what the project looks like when finished**. The convergence engine figures out the execution plan.

You write: "these files must exist, these checks must pass." Converge figures out the rest.

### The Terraform Analogy (for business/ops audiences)

Terraform describes the desired state of your infrastructure. You don't write "create VPC, then create subnet, then create security group..." You write "I want this infrastructure" and Terraform converges on it.

Converge does the same for AI workflows. You describe the desired state of your project. "These deliverables exist, these quality checks pass." Converge converges on it.

This analogy resonates with DevOps teams and business users who already think in terms of desired state.

### Master Comparison Table

| Capability | Converge | LangGraph | CrewAI | OpenAI Agents SDK | Google ADK | Smolagents |
|---|---|---|---|---|---|---|
| **Paradigm** | Gap-driven convergence | Graph-based | Role-based | Tool-use agents | Agent-to-agent | Code-first agents |
| **Language** | TypeScript | Python | Python | Python | Python | Python |
| **Define "done"** | Yes (checks, outputs, goals) | No | No | No | No | No |
| **Self-correction (LEARN.md)** | Yes | No | No | No | No | No |
| **Hierarchical nesting** | Infinite depth | Fixed graph | Flat | Flat | Flat | Flat |
| **Dynamic task spawning** | Yes (WBS) | No | No | No | No | No |
| **Filesystem-as-plan** | Yes | No | No | No | No | No |
| **Crash-safe checkpoints** | Yes | Partial | No | No | No | No |
| **Multi-provider LLM** | Yes (4 providers) | No (LangChain dep) | Yes | OpenAI only | Google only | Yes |
| **Reusable playbooks** | Yes (first-class) | No | Partial | No | No | No |
| **Just-in-time planning** | Yes | No | Partial | No | No | No |
| **Goal hierarchies** | Yes | No | No | No | No | No |
| **Core LoC** | ~270 | ~15K+ | ~10K+ | ~5K+ | ~8K+ | ~3K+ |
| **Test coverage** | 92% | Varies | Varies | Varies | Varies | Varies |
| **License** | MIT | MIT | MIT | MIT | Apache 2.0 | Apache 2.0 |

### Key Differentiators (Messaging Priority)

**1. Gap-driven convergence (primary differentiator)**
- "Define what done looks like. Converge measures the gap and closes it."
- Not another graph framework. Not another role-based crew. A fundamentally different paradigm.
- For business audiences: "You describe the deliverable. Converge figures out how to produce it."

**2. Self-correcting LEARN.md loops**
- "When tasks fail, Converge doesn't just retry. It analyzes the failure, writes LEARN.md, and the next attempt applies targeted corrections."
- Business angle: self-correction means fewer failed runs, less wasted API spend, less human intervention.
- This is the "wow" moment in demos. Prioritize showing it.

**3. Reusable playbooks**
- "Set up a workflow once. Run it repeatedly with different inputs. Share it across your team."
- This is the feature that converts individual users into team/company buyers.
- Playbooks are the bridge from "interesting framework" to "business tool."

**4. Crash-safe checkpoints**
- "Kill the process. Restart. Converge picks up exactly where it left off."
- Business angle: long-running workflows (hours/days) don't lose progress on interruption.
- Important for production workloads where reliability matters.

**5. Filesystem-as-plan convention**
- "Your `.converge/` directory IS the execution plan. `ls` is your debugger."
- Resonates with technical evaluators. Transparency builds trust.

### TypeScript Positioning

The AI framework space is overwhelmingly Python. This is both a challenge and an opportunity.

**Own the niche**: There is no prominent TypeScript-first AI agent framework. Claude Code's ecosystem (97M monthly MCP SDK downloads) is TypeScript-native. The audience exists and is underserved.

**Messaging**: "Built in TypeScript because the Claude Code ecosystem is TypeScript. Not a Python port. Not a wrapper. TypeScript-native from day one."

**Don't apologize for TypeScript.** Position it as a deliberate choice for the audience that matters. If Python demand materializes from business users, evaluate a port — but don't split focus at launch.

---

## 12. Risk Assessment

### 1. No Business Users Adopt (Paradigm Validation Failure)

| | |
|---|---|
| **Impact** | Critical |
| **Likelihood** | Medium |
| **Description** | Individual devs star the repo, but no solo entrepreneurs, teams, or companies adopt Converge for real business workflows. The convergence paradigm is intellectually interesting but doesn't convert to business value. |
| **Mitigation** | This is why we fail fast. The 30-day gate (Section 3) exists specifically for this. If business signals are absent after 30 days, don't invest further in community/cloud/enterprise. Pivot the messaging, pivot the audience, or shelve it. |
| **Monitoring** | Track business-signal metrics: consulting inquiries, "can I use this for X?" comments from teams/companies, playbook interest. Stars and downloads alone are not sufficient. |

### 2. "Just Another Framework" Perception

| | |
|---|---|
| **Impact** | High |
| **Likelihood** | High |
| **Description** | Developer fatigue with AI frameworks is real. LangGraph, CrewAI, AutoGen, OpenHands, OpenAI Agents SDK, Google ADK, Smolagents — the space is crowded and people are skeptical. |
| **Mitigation** | Lead with the paradigm difference, not the framework itself. The first sentence must communicate why this is different. Show the convergence loop in action — a 30-second GIF is worth 1000 words. For business audiences, lead with outcomes: "automated my client deliverable pipeline" > "new agent framework." |
| **Monitoring** | Track sentiment in comments. If "just another framework" appears consistently, adjust messaging to lead harder with business outcomes and the paradigm difference. |

### 3. Name Collision with converge.run

| | |
|---|---|
| **Impact** | Medium |
| **Likelihood** | Medium |
| **Description** | converge.run is an existing AI platform. Users may confuse the two. |
| **Mitigation** | Different category entirely (they do model serving, we do agent orchestration). Use distinct tagline "Define done. Converge gets there." Use `@converge/core` npm scope. SEO will differentiate over time. |
| **Monitoring** | Track brand confusion mentions. If persistent, consider "Converge Framework" as the full brand name. |

### 4. TypeScript in a Python-Dominated Space

| | |
|---|---|
| **Impact** | Medium |
| **Likelihood** | Medium |
| **Description** | Most AI framework developers and users are in the Python ecosystem. TypeScript limits the addressable market. |
| **Mitigation** | The Claude Code audience IS TypeScript-native. Don't try to serve everyone — serve the TypeScript AI community well. If >30% of business-user interest asks for Python, evaluate a port. But don't split focus at launch. |
| **Monitoring** | Track "Python version?" requests specifically from business users (not hobbyists). |

### 5. Competitors Copy the Paradigm

| | |
|---|---|
| **Impact** | High |
| **Likelihood** | Medium (6-12 month horizon) |
| **Description** | Once the convergence paradigm is proven, LangGraph or CrewAI bolts on a "convergence mode." Their existing distribution and community dwarfs ours. |
| **Mitigation** | Speed to market + commercial layer is the defense. The shared LEARN.md corpus (Converge Cloud) is a network effect competitors can't copy by adding a feature. Enterprise playbooks with domain expertise are defensible. The paradigm can be copied; the intelligence database and domain playbooks can't. Move fast on monetization — don't wait for competitors to catch up. |
| **Monitoring** | Track competitor changelogs and announcements. If a major framework announces convergence features, accelerate Cloud and playbook development. |

### 6. Single Maintainer Burnout

| | |
|---|---|
| **Impact** | Critical |
| **Likelihood** | High |
| **Description** | Every OSS project from a solo maintainer faces this. GitHub issues, content creation, bug fixes, customer support — it compounds fast. |
| **Mitigation** | The fail-fast approach is itself a mitigation: don't invest months of community management energy unless the paradigm is validated. If validation passes, use consulting/playbook revenue to fund a part-time contributor within 90 days. Automate CI, npm publish, issue triage. Batch community engagement (1 hour/day). Revenue-generating activities (consulting, playbook sales) take priority over free community support. |
| **Monitoring** | Track personal energy levels weekly. If issue response time exceeds 72 hours consistently, actively recruit a co-maintainer funded by revenue. |

### 7. SheetsRun IP Leakage

| | |
|---|---|
| **Impact** | High |
| **Likelihood** | Low (if audited properly) |
| **Description** | The framework was developed within the SheetsRun monorepo. References to SheetsRun, internal APIs, credentials, or proprietary logic could leak into the open-source release. |
| **Mitigation** | Use `git filter-repo` to create a clean repo with no SheetsRun history. Run automated scans: `grep -r "sheetsrun\|SheetsRun\|sheets-run\|sheets_run\|stitch\|claude-web-api" .` before going public. Manual review of every file in the npm publish tarball (`npm pack --dry-run`). Have a second person audit. |
| **Monitoring** | GitHub Action that scans for SheetsRun-related strings on every push. |

### 8. Pricing Enterprise Playbooks Wrong

| | |
|---|---|
| **Impact** | Medium |
| **Likelihood** | High |
| **Description** | Too cheap: leaves money on the table, signals low value. Too expensive: no adoption, can't validate demand. |
| **Mitigation** | Start with consulting (custom pricing per engagement) to learn willingness-to-pay before setting playbook prices. First 5 playbook customers get "founding member" pricing (50% off) in exchange for detailed feedback and case study permission. Adjust pricing based on real conversion data. |
| **Monitoring** | Track conversion rate at each price point. If >20% of inquiries convert, price is probably too low. If <5%, too high. |

---

## 13. Success Metrics

### Reframed: Business Signals Over Vanity Metrics

Stars, downloads, and Discord members are inputs, not outcomes. The metrics that matter are signals of business adoption and willingness to pay.

### 30-Day Targets (Validation Gate)

| Metric | Target | Signal | Go/No-Go Weight |
|--------|--------|--------|-----------------|
| npm weekly downloads | >200, growing | People are trying it | Medium |
| Substantive GitHub issues | >10 | People are building real things, not just browsing | High |
| Business use case mentions | >5 (in issues, comments, DMs) | People want to use this for real work | **Critical** |
| Consulting/implementation inquiries | >1 | Someone will pay | **Critical** |
| Playbook interest signals | >3 mentions | The playbook model has legs | High |
| GitHub stars | >500 | General market interest | Low (vanity) |

**Decision at 30 days**: If "Critical" signals are present → invest in Converge Cloud and enterprise playbooks. If absent → pivot messaging or shelve.

### 90-Day Targets (Only if 30-day gate passes)

| Metric | Target | Signal |
|--------|--------|--------|
| Paid consulting engagements | 3+ | Revenue validation |
| npm weekly downloads | >1,000 | Sustained adoption |
| Enterprise playbook pre-orders/waitlist | 10+ | Playbook model validated |
| GitHub stars | >2,000 | Sustained interest |
| Repeat users (multi-week npm downloads from same IPs) | >50 | Stickiness — not just try-once-and-leave |
| Team/company adoptions (self-reported) | 5+ | Business user thesis proven |

### 180-Day Targets (Only if 90-day signals are strong)

| Metric | Target | Signal |
|--------|--------|--------|
| Monthly recurring revenue (playbooks + cloud) | $5K+ MRR | Viable business |
| Converge Cloud beta users | 20+ teams | Cloud product validated |
| Enterprise pipeline | 3+ active conversations | Enterprise market exists |
| npm weekly downloads | >5,000 | Production usage |
| GitHub stars | >5,000 | Established project |
| Case studies published | 3+ | Social proof for enterprise sales |

### Metrics That Matter More Than Stars

- **Consulting conversion rate**: What % of inbound inquiries convert to paid engagements? Target: >20%.
- **Playbook attach rate**: What % of active framework users buy a playbook? Target: >5%.
- **Time-to-value**: How long from `npm install` to first successful workflow run? Target: <30 minutes.
- **Repeat usage**: What % of users run Converge more than once? Target: >40%. (One-time usage = curiosity, repeat usage = value.)
- **Issue quality**: Are issues from business users with real workflows, or from hobbyists with toy projects? Quality > quantity.

### Anti-Metrics (What NOT to Optimize For)

- **Star count alone**: Stars without business signals is developer tourism. Don't celebrate 1000 stars if zero teams adopted.
- **Community size without revenue signal**: 500 Discord members who never pay < 10 paying customers.
- **Framework comparisons won**: Don't optimize for winning benchmarks against LangGraph. Optimize for business outcomes.
- **Individual developer adoption**: 1000 solo devs experimenting < 10 teams using it in production.

---

## Appendix: Quick Reference

### Key Assets

| Asset | Location | Status |
|-------|----------|--------|
| Package README | `packages/harness/README.md` | Near-publication-ready, includes comparison table, architecture, API reference |
| Core Unit class | `packages/harness/src/unit/unit.ts` | 270 lines, 92% coverage |
| Public API surface | `packages/harness/src/index.ts` | 666 lines of exports — audit for rename consistency |
| Package metadata | `packages/harness/package.json` | Update for `@converge` scope |
| Multi-provider abstraction | `packages/agentfn/` | Claude, Gemini, Kimi, Qwen support |
| Root README | `README.md` | V2 architecture overview, needs rename |

### Key Numbers for Messaging

- **270 lines**: Unit class core logic
- **92%**: Test coverage
- **4 providers**: Claude, Gemini, Kimi, Qwen
- **MIT**: License
- **3 layers**: Project orchestration → Task execution → Attempt execution
- **∞ nesting**: One Unit class, infinite depth
- **0 dependencies on LLM SDKs in core**: Provider abstraction is a separate package

### Brand Voice

- Technical, direct, honest
- Business-outcome oriented ("saves 10 hours/week") alongside technical specifics ("270 lines of core logic")
- First person ("I built this because...")
- Include limitations alongside strengths
- Numbers over adjectives
- Show, don't tell (GIFs, terminal recordings, code snippets)
- Never: "revolutionary," "game-changing," "next-generation," "cutting-edge," "AI-powered"

### Competitive Moat Timeline

| Timeframe | Our Advantage | Competitor Response |
|-----------|--------------|-------------------|
| Month 0-6 | First-mover on convergence paradigm, only TS-native agent framework | Blog posts noting the paradigm, toy implementations |
| Month 6-12 | Enterprise playbooks, Converge Cloud (shared LEARN.md corpus), paying customers | Major framework adds "convergence mode" as a bolt-on feature |
| Month 12-18 | Network effect from shared intelligence, domain-specific playbook library, enterprise relationships | Serious convergence-native competitor may emerge |
| Month 18+ | If we've built the intelligence database and enterprise relationships, we're defensible. If not, we're vulnerable. | Full convergence frameworks with larger communities |

**Key insight**: The framework code is not defensible. 270 lines can be replicated. The defensible assets are: the shared LEARN.md corpus (network effect), enterprise playbooks (domain expertise), and customer relationships. Move fast on these.
