# Why Converge

## The Problem

AI agent frameworks today force you to define **how** work gets done:

- **LangGraph** makes you define execution graphs — nodes, edges, conditional routing. You're writing the plumbing, not the outcome.
- **CrewAI** assigns roles and hopes agents collaborate — but business workflows aren't improv theater.
- **AutoGen** lets agents chat until they figure it out — nondeterministic and unverifiable.
- **OpenAI Agents SDK / Google ADK** give you tool-use primitives — powerful for single tasks, unreliable for multi-step workflows.

All of them require you to specify **HOW** to get to done. But when you're automating a client deliverable pipeline, a compliance audit, or a content production workflow — you already know what the output looks like. You shouldn't need to choreograph every step.

## The Converge Approach

Converge uses **gap-driven convergence**: you define what "done" looks like, and the framework figures out how to get there.

1. **Define target state.** What files must exist? What checks must pass? What does the deliverable look like when it's finished?
2. **Converge measures the gap** between current state and target state, then generates work to close it.
3. **Self-correcting.** When a task fails a check, Converge writes a LEARN.md analyzing exactly what went wrong. The next attempt reads that analysis first and applies targeted corrections. Not "retry and hope" — structured learning between attempts.
4. **Hierarchical.** Project > Epic > Task > Subtask, with infinite nesting depth. A single `Unit` class handles every level. Complex projects decompose dynamically via WBS (Work Breakdown Structure).

Think of it like SQL or Terraform: SQL describes **what data you want**, not how to fetch it. Terraform describes **what infrastructure you want**, not what API calls to make. Converge describes **what the project looks like when finished** — the convergence engine figures out the execution plan.

## Key Advantages

- **Filesystem-first.** Your `.converge/` directory is the execution plan. `ls` is your dashboard, `cat` is your debugger. No opaque state stores or hidden databases.
- **Deterministic checks.** Verification uses grep-based checks against real files — no AI judgment calls on whether something "looks right."
- **WBS decomposition.** Tasks spawn subtasks dynamically based on project state, not a predetermined graph.
- **270 lines of core logic.** The entire Unit class — simple enough to read in one sitting, with 92% test coverage.
- **Multi-provider.** Claude, Gemini, Kimi, and Qwen via the `agentfn` abstraction. No vendor lock-in.
- **Crash-safe checkpoints.** Kill the process, restart, and Converge picks up exactly where it left off.
- **Reusable playbooks.** Set up a workflow once. Run it repeatedly with different inputs. Share it across your team.

## Who It's For

**Solo entrepreneurs** automating business workflows they currently do manually — content production, client deliverables, data processing, research reports. Every hour spent on repeatable work is an hour not spent on growth. Set up once, run repeatedly.

**Small teams (2-15 people)** standardizing delivery. Encode your team's best practices into playbooks. New hires deliver like veterans. Knowledge stops being siloed, onboarding gets faster, quality stays consistent.

**Companies** needing auditable AI workflows. AI adoption across departments is chaotic without a framework — every team uses different tools, no consistency, no audit trail. Converge gives you filesystem-based auditability and deterministic verification.

## Getting Started

See [Getting Started](getting-started.md) to install Converge and run your first workflow.
