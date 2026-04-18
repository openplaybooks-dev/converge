# Comparison Matrix

Feature comparison of Converge against other AI agent orchestration frameworks.

---

## Feature Comparison

| Feature | Converge | LangGraph | CrewAI | AutoGen | Mastra |
|---------|----------|-----------|--------|---------|--------|
| **Core paradigm** | Gap-driven convergence | Graph-based state machine | Role-based multi-agent | Conversation-based | TypeScript-native workflows |
| **Task decomposition** | WBS + dynamic generation from gaps | Manual graph nodes | Role delegation | Chat rounds | DAG workflow steps |
| **Self-correction** | Built-in (LEARN.md failure analysis) | Manual retry nodes | Limited (delegation fallback) | Re-prompting via conversation | Step-level retry |
| **State management** | Filesystem-first (`.converge/journal/`) | In-memory (optional checkpointers) | In-memory | Conversation history | Database-backed |
| **Observability** | `ls` + `cat` + `converge status` | LangSmith + LangGraph Studio | Built-in logging | AutoGen Studio | Dashboard + tracing |
| **Language** | TypeScript | Python | Python | Python | TypeScript |
| **Define "done" (target state)** | Yes (checks, outputs, goals) | No | No | No | No |
| **Hierarchical task nesting** | Infinite depth | Fixed graph | Flat | Flat | DAG |
| **Dynamic task generation** | Yes (from detected gaps) | Limited (conditional edges) | No | No | No |
| **Crash-safe checkpoints** | Yes | Partial (via checkpointers) | No | No | Partial |
| **Multi-provider LLM** | Yes (4 providers) | Via LangChain | Yes | Yes | Yes |
| **Reusable playbooks** | Yes (first-class) | No | Partial (crew configs) | No | Partial (workflows) |
| **Filesystem-based state** | Yes | No | No | No | No |
| **Web UI** | No (CLI-only) | Yes (LangGraph Studio) | No | Yes (AutoGen Studio) | Yes |
| **Core LoC** | ~270 | ~15K+ | ~10K+ | ~10K+ | ~5K+ |
| **License** | MIT | MIT | MIT | MIT | MIT |

---

## Use Case Matrix — When to Use Each Framework

| Use Case | Best Fit | Why |
|----------|----------|-----|
| Business workflow automation with verifiable outcomes | **Converge** | Define target state and checks; the engine converges on them |
| Fine-grained control over agent workflow topology | **LangGraph** | Graph model gives explicit control over execution order |
| Multi-agent scenarios with specialized roles | **CrewAI** | Role-based abstraction maps naturally to team-like delegation |
| Research and exploration via agent conversations | **AutoGen** | Conversation-based coordination suits open-ended exploration |
| TypeScript teams needing DAG-based workflows | **Mastra** | TypeScript-native with step-level workflow control |
| Self-correcting multi-step workflows | **Converge** | LEARN.md failure analysis improves across attempts |
| Teams already invested in the LangChain ecosystem | **LangGraph** | Extensive integrations, LangSmith observability, large community |
| Long-running workflows that must survive interruption | **Converge** | Crash-safe checkpoints resume from last state |

---

## Migration Pointers

| From | To Converge | Key Changes |
|------|------------|-------------|
| **LangGraph** | Replace graph nodes with target-state checks. Remove manual retry edges — self-correction is built in. State moves from in-memory dicts to filesystem. | Graph topology → convergence goals |
| **CrewAI** | Replace role/crew definitions with playbook tasks and checks. Agent specialization becomes task-level LLM configuration. | Role abstraction → task checks |
| **AutoGen** | Replace conversation patterns with explicit task definitions and verification checks. Structured output replaces conversation-driven coordination. | Conversation flow → gap-driven tasks |
| **Mastra** | Replace DAG step definitions with convergence tasks. Step-level retries become LEARN.md-based self-correction. Both are TypeScript-native. | DAG steps → convergence loops |

---

## Honest Limitations of Converge

- **No web UI**: CLI-only. LangGraph Studio and AutoGen Studio offer visual debugging.
- **Smaller ecosystem**: Fewer integrations and community resources than LangGraph or CrewAI.
- **Single-machine execution**: No distributed task execution across machines.
- **TypeScript-only**: No Python support, limiting reach in the Python-dominated AI framework space.
- **Earlier maturity**: Newer project with less production battle-testing than established frameworks.
