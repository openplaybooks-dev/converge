# Product Identity for Naming

## Product Truth

Converge is a build system for AI agents. It takes a playbook — a tree of TASK.md files and folders — compiles it into a DAG, and dispatches AI agents to execute each node. Every task declares shell-command checks (`tsc`, `jq`, `grep`, a test suite). The runtime loops until checks pass. No LLM judging its own output.

The core primitive: **diverge → converge.** Break the problem into independent pieces, run them in parallel, assemble the result. Recursive — any piece can itself diverge.

This is not a chat wrapper. This is not an agent framework. This turns chaotic one-off AI conversations into repeatable, verifiable, DAG-based work that can be version-controlled, cached, and re-run.

## Audience

Senior software engineers and technical teams who are already using AI coding agents (Claude Code, Codex, Cursor) and have hit the wall on what a single chat window can do. They need determinism, not vibes. They want the same inputs to produce the same outputs. They want to ship software, not manage prompt chains.

Secondary: platform teams and DevOps engineers evaluating how to productionize AI-assisted development at scale.

## Emotional Promise

**Calm control.** The feeling of knowing exactly what ran, what passed, and what's left — without babysitting a chat window. The confidence of a build system applied to AI work.

## Differentiators

- **Checks, not vibes.** Shell commands verify output. The runtime loops until they pass.
- **Fingerprint caching.** Unchanged nodes skip execution — like dbt incremental models.
- **Playbooks, not prompts.** Version-controlled TASK.md files. Same inputs, same outputs.
- **DAG, not context window.** 670 tasks, zero lost context. Topological execution.
- **Swap providers.** Claude, Gemini, Kimi, Qwen, Codex — change one config, same playbook runs.

## Naming Constraints

- Must work as a CLI binary (`converge <verb>` is the current placeholder)
- Must work as an npm scope (`@<name>/core`)
- Must work as a GitHub org
- 4–10 letters preferred, max 15
- No slurs or offensive terms
- Avoid generic AI terms: agent, ai, lang, chain, crew, auto
- Must be pronounceable on first sight, spellable after hearing once
- Must survive being spoken aloud in standup and typed in a terminal