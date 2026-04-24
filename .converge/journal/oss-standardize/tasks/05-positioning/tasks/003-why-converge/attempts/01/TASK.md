# Task: 05-positioning/003-why-converge

Create "Why Converge" landing page content — the persuasive case
for choosing Converge over alternatives.

**Reference**: Read `docs/converge-gtm.md` sections 1, 3, and 11.
Read `docs/brand-messaging.md` for voice and key messages.

**Structure** (`docs/why-converge.md`):

1. **The Problem** — AI agent frameworks today:
   - Force you to define execution graphs (LangChain)
   - Assign roles and hope agents collaborate (CrewAI)
   - Let agents chat until they figure it out (AutoGen)
   - All require you to specify HOW, not just WHAT

2. **The Converge Approach** — gap-driven convergence:
   - Define target state ("done looks like this")
   - Converge measures the gap between current and target
   - Self-correcting: failures produce LEARN.md, fed into next attempt
   - Hierarchical: Project > Epic > Task > Subtask (infinite depth)

3. **Key Advantages**:
   - Filesystem-first: `ls` is your dashboard, `cat` is your debugger
   - Deterministic checks: grep-based verification, no AI judgment needed
   - WBS decomposition: dynamic task generation based on project state
   - 270 lines of core logic: simple enough to read in one sitting
   - Multi-provider: Claude, Gemini, Kimi, Qwen via agentfn

4. **Who It's For**:
   - Solo entrepreneurs automating business workflows
   - Small teams standardizing delivery
   - Companies needing auditable AI workflows

5. **Getting Started** — link to docs/getting-started.md

**Tone**: Persuasive but honest. Lead with the problem, not the solution.
Specific claims, not superlatives.