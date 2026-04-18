# ADR-004: YAML + Markdown Playbook Format

**Status**: Accepted
**Date**: 2026-04-18

## Context

Task definitions need to carry both machine-parseable metadata (inputs, outputs, checks, dependencies) and human/AI-readable instructions (step-by-step procedures, context, examples). Pure code (TypeScript task definitions) provides full flexibility but requires a build step and programming knowledge. Pure config (JSON/YAML) is easy to parse but poor at expressing free-form instructions.

## Decision

The default task format is `TASK.md` — a Markdown file with YAML frontmatter. The YAML frontmatter contains structured metadata (id, title, inputs, outputs, checks, dependencies) validated by Zod schemas. The Markdown body contains free-form instructions injected verbatim into the AI's execution context. For cases requiring programmatic task definition, a TypeScript API (`taskDef().id().title().build()`) is also available.

## Consequences

- **Easier**: Low barrier to entry — no build step, no TypeScript knowledge required to author tasks. YAML diffs cleanly in git. Markdown body supports any instruction format: step-by-step procedures, code snippets, decision trees, references. Clean separation of concerns between what the system needs (frontmatter) and what the AI needs (body).
- **Harder**: Two formats (TASK.md and task.ts) must be supported. YAML frontmatter parsing adds complexity compared to pure TypeScript. Schema evolution requires updating both the Zod schema and documentation.
