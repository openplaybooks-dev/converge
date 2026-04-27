---
id: 002-drop-domain-panels
title: Drop MC-domain panels (channels, cron-mgmt, memory, multi-gateway, etc.)
outputs:
  - .converge/studio-state/dropped-domain-panels.txt
checks:
  - id: domain-panels-gone
    description: A representative set of MC-domain panels are gone
    cmd: "test ! -f packages/studio/src/components/panels/channels-panel.tsx && test ! -f packages/studio/src/components/panels/cron-management-panel.tsx && test ! -f packages/studio/src/components/panels/memory-browser-panel.tsx && test ! -f packages/studio/src/components/panels/multi-gateway-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-config-panel.tsx && test ! -f packages/studio/src/components/panels/gateway-control-panel.tsx && test ! -f packages/studio/src/components/panels/orchestration-bar.tsx && test ! -f packages/studio/src/components/panels/pipeline-tab.tsx && test ! -f packages/studio/src/components/panels/skills-panel.tsx && test ! -f packages/studio/src/components/panels/standup-panel.tsx"
  - id: marker-written
    description: A marker file recording the drop is written
    cmd: "test -f .converge/studio-state/dropped-domain-panels.txt"
---

```bash
cd packages/studio/src/components/panels
rm -f channels-panel.tsx cron-management-panel.tsx \
      memory-browser-panel.tsx memory-graph.tsx \
      multi-gateway-panel.tsx gateway-config-panel.tsx gateway-control-panel.tsx \
      orchestration-bar.tsx pipeline-tab.tsx \
      skills-panel.tsx standup-panel.tsx \
      super-admin-panel.tsx user-management-panel.tsx \
      cost-tracker-panel.tsx integrations-panel.tsx webhook-panel.tsx \
      alert-rules-panel.tsx audit-trail-panel.tsx system-monitor-panel.tsx \
      local-agents-doc-panel.tsx office-panel.tsx documents-panel.tsx \
      notifications-panel.tsx nodes-panel.tsx security-audit-panel.tsx \
      session-details-panel.tsx settings-panel.tsx token-dashboard-panel.tsx \
      chat-page-panel.tsx debug-panel.tsx task-board-panel.tsx \
      github-sync-panel.tsx
cd /Users/minh/Documents/converge

mkdir -p .converge/studio-state
echo "Dropped MC-domain panels at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/dropped-domain-panels.txt
```

**Do NOT delete** widget primitives, log-viewer-panel, or activity-feed-panel — those are kept and rebound by Phase 03.
