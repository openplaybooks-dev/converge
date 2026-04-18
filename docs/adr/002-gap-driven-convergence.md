# ADR-002: Gap-Driven Convergence Loop

**Status**: Accepted
**Date**: 2026-04-18

## Context

Workflow orchestration systems typically use directed acyclic graphs (DAGs) where tasks and their dependencies are defined upfront. Multi-agent frameworks let agents communicate freely. Both approaches assume the full scope of work is known before execution begins. In practice, complex projects reveal new requirements as work progresses — a static plan cannot anticipate every subtask.

## Decision

Converge uses a convergence loop that continuously compares current state against target state, detects gaps, and spawns tasks to close them. Rather than executing a predetermined plan, the system iterates: evaluate goals, find gaps (missing plans, failed checks, missing outputs, blockers), attempt repairs via a multi-strategy pipeline, and re-evaluate. Execution terminates when no gaps remain or the system detects a stall.

Gap types include `plan` (missing plan), `wbs` (subtasks not seeded), `blocker` (missing inputs), `output` (task output not created), `check-failed` (validation failed), and `corrupted` (invalid output).

## Consequences

- **Easier**: The system adapts to actual project state rather than requiring perfect upfront planning. New tasks emerge naturally from detected gaps. Recovery from partial failures is built-in — the loop simply detects remaining gaps and continues.
- **Harder**: Reasoning about execution order is less obvious than reading a DAG. Convergence detection (stall vs. progress) requires careful heuristics. Maximum iteration limits are needed to prevent infinite loops.
