---
id: 006-comparisons
title: Create framework comparison documentation
dependencies:
  - 003-root-readme
outputs:
  - docs/comparisons.md
checks:
  - id: comparisons-exists
    description: Comparisons doc exists
    cmd: test -f docs/comparisons.md
---

Create a detailed framework comparison document.

**Reference**: Read `docs/converge-gtm.md` section 11 (Differentiation Messaging)
for comparison data and positioning.

**Compare against**:
- LangChain/LangGraph — graph-based orchestration
- CrewAI — role-based multi-agent
- AutoGen — conversation-based multi-agent
- Mastra — TypeScript agent framework
- OpenHands — step-based coding agent

**For each framework, cover**:
1. Core paradigm (how it orchestrates work)
2. Task decomposition approach
3. Error handling / self-correction
4. State management
5. Observability / debugging
6. Language / ecosystem

**Feature comparison matrix** (table format):
| Feature | Converge | LangChain | CrewAI | AutoGen | Mastra |
|---------|----------|-----------|--------|---------|--------|

**Tone**: Factual and fair. Acknowledge strengths of other frameworks.
Position Converge's gap-driven convergence as a genuinely different paradigm,
not just "better."
