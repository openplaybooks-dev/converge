---
title: "Troubleshooting"
description: "Symptom-indexed fixes for run-blockers we know how to solve."
sidebar:
  order: 0
---
Symptom-indexed fixes for run-blockers we know how to solve. Each entry is symptom → root cause → fix recipe → verification. If your symptom isn't here, surface the failing node ID, exact event lines, and what you've tried.

## Quick index

1. [Previous run cancelled: node status unclear](/troubleshooting/previous-session-cancelled) —
   `RUN_CANCELLED. Runstate shows some nodes complete, some pending.`
2. [Stale outputs: paths after workflow moved files](/troubleshooting/stale-outputs-paths) —
   `CHECK_FAIL: Task output not created: <path>. File exists at different location.`
3. [Stale inputs: blocking a node that should be ready](/troubleshooting/stale-inputs) —
   `INPUT_MISSING: <path>. Upstream producer moved or renamed the file.`
4. [Missing Seed sub-template directory](/troubleshooting/missing-seed-sub-template) —
   `NODE_FAIL: seed script import failed: <path>/seed.js. Sub-template not found.`
5. [Cycle detected in DAG](/troubleshooting/cycle-detected) —
   `CYCLE_DETECTED [id1 → id2 → id1]. depends_on edges form a cycle.`
6. [Foreign playbook hijacks converge run](/troubleshooting/foreign-playbook-hijacks) —
   `converge run starts tasks from wrong playbook after primary finishes.`
7. [Seed-script self-repair self-test fails (ignorable)](/troubleshooting/seed-self-test-fail) —
   `Self-test FAIL: Variable not found in code. Safe to ignore if parent spawns children.`
8. [Tree doesn't see Seed-spawned children: phase stuck seeded](/troubleshooting/seed-children-not-seen) —
   `Phase stays seeded even though all files exist on disk.`
9. [Parent stays seeded while all children show complete](/troubleshooting/parent-stays-seeded) —
   `Seed parent marked complete but has no children: reverting to pending.`
10. [Secondary playbook fails after main one finishes](/troubleshooting/secondary-playbook-fails) —
    `Primary completes, then secondary playbook fails on platform/setup issues.`
11. [Pre-existing typecheck/build errors in vendored code](/troubleshooting/vendored-type-errors) —
    `typecheck fails on files that pre-date this run (vendored deps, upstream fork).`
12. [Verification task expects browser/server E2E inside an AI spawn](/troubleshooting/e2e-in-ai-spawn) —
    `Task tries to run pnpm dev, curl, kill long-lived servers inside an AI attempt.`
13. [Mixed-shape task: file-creation + tree-wide cleanup in one task](/troubleshooting/mixed-shape-task) —
    `Single task needs 15+ min and 2+ attempts because existence + negation checks converge at different rates.`

## When NONE of these match

1. **Stop the run.** Don't keep killing/relaunching with no plan.
2. **Inspect the per-task journal**: check the task's attempt folder for LEARN.md, event logs, and check outputs.
3. **Surface the failing task ID, exact log lines, what you've tried, your hypothesis, and a proposed fix** (to a maintainer / on the issue tracker).
4. Wait for review before applying any patch.
