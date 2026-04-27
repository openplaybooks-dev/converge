# Task: 04-drop-mc-only/002-drop-domain-panels

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