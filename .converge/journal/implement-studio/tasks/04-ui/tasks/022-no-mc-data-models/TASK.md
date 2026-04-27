---
id: 022-no-mc-data-models
title: No Mission Control data-model references in src/
dependencies:
  - 019-purge-mc-surface
checks:
  - id: no-mc-string
    description: "'Mission Control' literal does not appear in src/ or messages/"
    cmd: "test -z \"$(grep -ril 'mission control' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)\""
  - id: no-fleet
    description: No 'fleet' identifier or string in src/
    cmd: "test -z \"$(grep -rl '\\bfleet\\b\\|Fleet[A-Z]\\|FLEET' packages/converge-studio/src 2>/dev/null)\""
  - id: no-launch-sequence
    description: No 'launch sequence' / 'launchSequence' / 'LaunchSequence' references
    cmd: "test -z \"$(grep -ril 'launch sequence\\|launchsequence\\|launch_sequence' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)\""
  - id: no-dispatch-task
    description: No 'dispatch a task' / 'dock an agent' UI strings
    cmd: "test -z \"$(grep -ril 'dispatch a task\\|dock an agent\\|dock agent\\|register your first agent' packages/converge-studio/src packages/converge-studio/messages 2>/dev/null)\""
  - id: no-gateway
    description: No gateway/openclaw type names or imports
    cmd: "test -z \"$(grep -rl '\\bGateway\\b\\|OpenClaw\\|openclaw\\|gatewayUrl\\|gateway_url' packages/converge-studio/src 2>/dev/null)\""
  - id: no-agent-runtime
    description: No agent-runtime / fleet-status type or import
    cmd: "test -z \"$(grep -rl 'agent-runtime\\|agentRuntime\\|AgentRuntime\\|fleetStatus\\|FleetStatus' packages/converge-studio/src 2>/dev/null)\""
---

Codify the negative gate: every Mission Control data-model leak is a check failure.

This task is intentionally check-only — its work is done by 019/020/021. The task exists to make the gate explicit and catch regressions: if a future task adds `fleet`, `gateway`, `LaunchSequence`, etc., back into the tree, this check will fail.

**If any check fails on first run, the issue is one of:**
- 019-purge-mc-surface left some files behind. Re-inspect `find packages/converge-studio/src -name '*gateway*' -o -name '*openclaw*' -o -name '*fleet*'`.
- 020-converge-shell didn't update `messages/en.json` (or other locales) — Mission Control strings still in the catalog.
- A converge-native file imports an MC type. Resolve by replacing with the converge equivalent or removing.

**No code to write.** The task body is informational. Just run the checks.
