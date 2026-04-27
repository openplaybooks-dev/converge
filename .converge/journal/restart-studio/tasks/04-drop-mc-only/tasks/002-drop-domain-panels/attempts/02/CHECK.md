# Checks: 04-drop-mc-only/002-drop-domain-panels

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## domain-panels-gone
**Description**: A representative set of MC-domain panels are gone
**Command**: `test ! -f packages/studio/src/components/panels/channels-panel.tsx && test ! -f packages/studio/src/components/panels/cron-management-panel.tsx && test ! -f packages/studio/src/components/panels/memory-browser-panel.tsx && test ! -f packages/studio/src/components/panels/multi-gateway-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-config-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-control-panel.tsx && test ! -f packages/studio/src/components/panels/orchestration-bar.tsx && test ! -f packages/studio/src/components/panels/pipeline-tab.tsx && test ! -f packages/studio/src/components/panels/skills-panel.tsx && test ! -f packages/studio/src/components/panels/standup-panel.tsx`

## marker-written
**Description**: A marker file recording the drop is written
**Command**: `test -f .converge/studio-state/dropped-domain-panels.txt`