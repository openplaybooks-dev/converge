# ADR-003: WBS Scripts for Dynamic Task Generation

**Status**: Accepted
**Date**: 2026-04-18

## Context

Task decomposition — breaking a large goal into subtasks — can be done statically (list all subtasks in config) or dynamically (generate subtasks at runtime). Static decomposition fails when the number or nature of subtasks depends on project state that isn't known until execution time. For example, generating one task per screen in a UI project requires reading a screen manifest first.

## Decision

Converge uses Work Breakdown Structure (WBS) scripts — JavaScript/TypeScript functions that run once per parent task to spawn child tasks dynamically. WBS scripts receive a context object with a `spawn()` method and can read project files, inspect state, and generate an arbitrary number of child tasks with dependencies between them. Spawned tasks are written to a `tasks/` subdirectory under the parent and are checkpoint-safe (already-spawned children aren't re-spawned on resume). WBS scripts can nest — spawned tasks can themselves have WBS scripts.

## Consequences

- **Easier**: Task scope can be discovered from actual project state (file counts, config entries, API schemas). Dependencies between generated tasks are expressed naturally in code. Complex decomposition logic lives in a real programming language, not a constrained config format.
- **Harder**: WBS scripts are imperative code, so they're harder to validate statically than declarative config. Understanding the full task tree requires running (or reading) the WBS scripts. Testing WBS scripts requires mocking the spawn context.
