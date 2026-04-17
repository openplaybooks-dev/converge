---
title: Create Feature Comparison Matrix
outputs:
  - docs/comparison-matrix.md
checks:
  - id: matrix-exists
    cmd: test -f docs/comparison-matrix.md
    description: Comparison matrix document exists
  - id: matrix-has-table
    cmd: "grep -c '|' docs/comparison-matrix.md | xargs test 5 -le"
    description: Document has a comparison table
dependencies:
  - 001-tagline-pitch
---

Create a detailed feature comparison matrix for marketing and documentation.

**Reference**: Read `docs/converge-gtm.md` section 11 for existing comparison data.
Also read `docs/comparisons.md` (created in Epic 2) to avoid duplication — this
document is the marketing-focused version.

**Format**: Markdown tables optimized for rendering on GitHub and websites.

**Comparison dimensions**:

| Feature | Converge | LangChain | CrewAI | AutoGen | Mastra |
|---------|----------|-----------|--------|---------|--------|
| Core paradigm | Gap-driven | Graph-based | Role-based | Conversation | TypeScript-native |
| Task decomposition | WBS + inline | Manual chains | Role delegation | Chat rounds | Workflow steps |
| Self-correction | Built-in (LEARN.md) | Manual retry | Limited | Re-prompting | Manual |
| State management | Filesystem-first | In-memory | In-memory | Messages | Database |
| Observability | `ls` + `cat` | LangSmith | CrewAI+ | Console | Dashboard |
| Language | TypeScript | Python | Python | Python | TypeScript |
| Lines of core logic | ~270 | ~50K | ~15K | ~20K | ~10K |

**Additional comparison tables**:
- When to use each framework (use case matrix)
- Migration guide pointers (from each framework to Converge)
- Feature roadmap comparison (what's planned vs available)

**Tone**: Fair and factual. Acknowledge where competitors are stronger.
Position convergence as a paradigm difference, not a quality judgment.
