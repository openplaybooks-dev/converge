# Social Media Kit

Ready-to-post content for the Converge launch. Each section is tailored to the platform's culture and audience.

---

## 1. Twitter/X Launch Thread

**Tweet 1 — Hook + Tagline**

> I built an open-source framework that flips AI agent orchestration on its head.
>
> Instead of defining steps, graphs, or roles — you define what "done" looks like.
>
> Converge measures the gap and closes it.
>
> "Define done. Converge gets there."
>
> Thread

**Tweet 2 — The Problem**

> The problem with AI agent frameworks today:
>
> You have to be an AI engineer to use them.
>
> LangGraph: define a graph. CrewAI: assign roles. AutoGen: manage conversations.
>
> But real business workflows aren't about choreographing steps. They're about getting to a known outcome.

**Tweet 3 — How Convergence Works**

> How Converge works:
>
> 1. You declare the target state — files that must exist, checks that must pass
> 2. The framework detects gaps between current state and target
> 3. AI agents generate work to close gaps
> 4. Checks verify the output
> 5. If checks fail → LEARN.md analyzes the failure → next attempt self-corrects
>
> Not "retry and hope." Structured learning between attempts.

**Tweet 4 — Key Differentiators**

> Some numbers:
>
> - 270 lines of core logic (Unit class)
> - 92% test coverage
> - 4 LLM providers: Claude, Gemini, Kimi, Qwen
> - Filesystem-first: `ls` and `cat` are your debugger
> - Crash-safe checkpoints: kill the process, restart, pick up where you left off
> - MIT licensed

**Tweet 5 — Code Snippet**

> A Converge playbook looks like this:
>
> ```yaml
> project: client-report
> epics:
>   - name: research
>     tasks:
>       - name: gather-data
>         check: test -f output/data.json
>       - name: analyze
>         check: test -f output/analysis.md
>   - name: deliverable
>     tasks:
>       - name: generate-report
>         check: test -f output/report.pdf
> ```
>
> Define the deliverable. Converge figures out the rest.

**Tweet 6 — Links**

> Converge is open source and available now.
>
> GitHub: [link]
> npm: `npm install @converge/core`
> Blog: "Why We Built Converge" [link]
>
> TypeScript-native. Built for the Claude Code ecosystem. Not a Python port.

**Tweet 7 — Call for Contributors**

> This is v0.1.0 — early, with rough edges.
>
> Looking for:
> - People with real business workflows to automate
> - TypeScript developers who want to contribute
> - Teams willing to try it on a real project and share feedback
>
> Issues tagged `good-first-issue` are ready.
>
> What workflows are eating your time?

---

## 2. LinkedIn Post

**Why We Built Converge**

Every AI agent framework today asks the same question: "How should the AI get there?"

Define a graph. Assign roles. Sequence steps. Manage conversations.

But when I look at how businesses actually work, nobody cares about the how. They care about the what. What does the deliverable look like when it's done? What checks need to pass? What files need to exist?

That's why we built Converge — an open-source, TypeScript-native framework for AI agent orchestration that starts with a different question: "What does done look like?"

You declare the target state. Converge continuously measures the gap between where you are and where you need to be, generates work to close it, and self-corrects when things fail. Not retry-and-hope — structured failure analysis that carries forward between attempts.

We're using it to automate client deliverable pipelines, content production workflows, and full-stack application scaffolding. The same playbook runs repeatedly with different inputs.

Some specifics:
- 270 lines of core logic, 92% test coverage
- Supports Claude, Gemini, Kimi, and Qwen
- Crash-safe checkpoints for long-running workflows
- Reusable playbooks that encode team best practices
- MIT licensed

If your team spends time on repeatable, multi-step workflows that need to produce verified outputs — this was built for you.

GitHub: [link]
npm: @converge/core

---

## 3. Hacker News — Show HN

**Title**: Show HN: Converge -- gap-driven convergence framework for AI agents (TypeScript)

**Body**:

Converge is a TypeScript framework for orchestrating multi-step AI agent workflows. The core idea: instead of defining execution graphs or agent roles, you define the target state (files that exist, checks that pass) and the framework converges on it.

How it works:

- Declare target state via checks (shell commands that must exit 0)
- Framework detects gaps between current state and target
- AI agents generate work to close gaps
- On failure, a LEARN.md is written analyzing what went wrong
- Next attempt reads LEARN.md and applies targeted corrections

The self-correction loop is the key differentiator. It's not retry — it's structured learning between attempts.

Technical details:

- Core logic: ~270 lines (single Unit class handles all nesting levels)
- Test coverage: 92%
- Providers: Claude, Gemini, Kimi, Qwen via `agentfn` abstraction
- Filesystem-first: `.converge/` directory is the execution plan; `ls` is your debugger
- Crash-safe: checkpoints survive process termination
- Reusable playbooks with input variables and dependency graphs

Built in TypeScript because the Claude Code ecosystem (97M monthly MCP SDK downloads) is TypeScript-native. Not a wrapper around a Python library.

Comparison to existing tools: LangGraph requires graph definition, CrewAI requires role assignment, both are Python. Converge is declarative — closer to Terraform's model (desired state → converge) than to workflow orchestration.

Limitations: early (v0.1.0), documentation is incomplete, best suited for workflows with clearly definable success criteria.

GitHub: [link]
npm: `npm install @converge/core`

---

## 4. Reddit Posts

### r/MachineLearning — Technical Framing

**Title**: Converge: a gap-driven convergence approach to AI agent orchestration (TypeScript, MIT)

I've been working on a different paradigm for multi-step AI agent workflows. Instead of defining execution graphs (LangGraph) or agent roles (CrewAI), Converge uses gap-driven convergence: you declare what the target state looks like (checks that must pass, files that must exist), and the framework iteratively closes the gap.

The interesting part is the self-correction mechanism. When a task fails a check, the framework generates a LEARN.md that analyzes the failure — what went wrong, what the agent should do differently. On the next attempt, the agent reads LEARN.md first and applies corrections. It's structured failure analysis, not blind retry.

Architecture: a single Unit class (~270 lines) handles all levels of hierarchy (Project > Epic > Task > Subtask) with infinite nesting. Providers are abstracted via `agentfn` — currently supports Claude, Gemini, Kimi, and Qwen.

I'm curious whether this convergence-based approach has parallels in other optimization or control theory domains that I should look into. The gap → measure → act → verify loop feels related to control systems but I haven't formalized it.

Paper/code: [link]

---

### r/SideProject — Builder Framing

**Title**: I built a framework that automates my repeatable business workflows with AI agents

I run a solo operation and kept burning hours on the same types of work — client reports, project templates, multi-step data processing. Claude Code handles single tasks well, but a 12-step workflow where each step verifies the last? It falls apart.

So I built Converge. Define what "done" looks like for each step (files that exist, quality checks that pass), and the framework keeps running until everything converges. If something fails, it writes an analysis and corrects itself on the next attempt.

I now have playbooks for my most common workflows. Set up once, run repeatedly with different inputs. A content production workflow that used to take me 4 hours runs autonomously with quality verification.

It's open-source (MIT), TypeScript, works with Claude/Gemini/Kimi/Qwen. 270 lines of core logic, 92% test coverage.

[link]

What repeatable workflows are eating your time? Curious what other solo builders would automate first.

---

### r/typescript — Ecosystem Framing

**Title**: Converge: TypeScript-native AI agent orchestration framework (270 LoC core, 92% test coverage)

The AI agent framework space is almost entirely Python — LangGraph, CrewAI, AutoGen, Smolagents. If you're building in TypeScript, you're either wrapping Python libraries or rolling your own.

Converge is TypeScript-native from the ground up. Not a port, not a wrapper. Built for the Claude Code / MCP ecosystem.

The core idea: gap-driven convergence. You declare the target state (checks that pass, files that exist), and the framework iteratively closes the gap. On failure, structured self-correction via LEARN.md carries failure analysis forward between attempts.

Core architecture:
- Single `Unit` class (~270 lines) handles all hierarchy levels
- Multi-provider LLM abstraction (`agentfn`) — Claude, Gemini, Kimi, Qwen
- Filesystem-first: `.converge/` directory is the execution plan
- Crash-safe checkpoints
- Reusable playbooks with typed input variables
- 92% test coverage

`npm install @converge/core`

GitHub: [link]

Early (v0.1.0), looking for TypeScript developers who want to contribute. Issues tagged `good-first-issue` are available.

---

## 5. Discord/Slack Announcement

**Converge v0.1.0 — open-source AI agent orchestration framework**

Define what "done" looks like. Converge closes the gap.

Gap-driven convergence framework for multi-step AI workflows. TypeScript-native, MIT licensed.

- Declare target state via checks → framework converges on completion
- Self-correcting: LEARN.md carries failure analysis between attempts
- 270 lines of core logic, 92% test coverage
- Providers: Claude, Gemini, Kimi, Qwen
- Reusable playbooks, crash-safe checkpoints

GitHub: [link]
npm: `npm install @converge/core`

Early release — feedback and contributions welcome.
