---
id: 003-drop-domain-libs
title: Drop MC-domain libs (gateway-*, openclaw-*, websocket-*, etc.)
outputs:
  - .converge/studio-state/dropped-domain-libs.txt
checks:
  - id: domain-libs-gone
    description: gateway-*, openclaw-*, websocket-*, agent-* lib files are gone
    cmd: "test -z \"$(ls packages/studio/src/lib/gateway-*.ts 2>/dev/null)\" && test -z \"$(ls packages/studio/src/lib/openclaw-*.ts 2>/dev/null)\" && test -z \"$(ls packages/studio/src/lib/websocket*.ts 2>/dev/null)\" && test -z \"$(ls packages/studio/src/lib/agent-*.ts 2>/dev/null)\" && test -z \"$(ls packages/studio/src/lib/onboarding-*.ts 2>/dev/null)\""
  - id: marker-written
    description: A marker file recording the drop is written
    cmd: "test -f .converge/studio-state/dropped-domain-libs.txt"
---

```bash
cd packages/studio/src/lib
rm -f gateway-*.ts openclaw-*.ts onboarding-*.ts pty-*.ts websocket*.ts \
      agent-*.ts \
      auth.ts auto-credentials.ts claude-sessions.ts claude-tasks.ts \
      codex-sessions.ts opencode-sessions.ts \
      hermes-*.ts gnap-*.ts mcp-*.ts \
      docs-knowledge.ts github-*.ts hook-profiles.ts \
      local-agent-sync.ts memory-*.ts navigation*.ts office-layout.ts \
      provider-subscriptions.ts receipt-signing.ts recurring-tasks.ts \
      runs.ts scheduler.ts security-*.ts spawn-history.ts \
      task-status.ts use-server-events.ts use-smart-poll.ts \
      webhooks.ts coordinator-routing.ts framework-templates.ts \
      command.ts config.ts db.ts device-identity.ts json-relaxed.ts \
      mentions.ts migrations.ts runtime-env.ts schema.sql sessions.ts \
      skill-registry.ts skill-sync.ts super-admin.ts tailscale-serve.ts \
      transcript-parser.ts validation.ts agent-evals.ts agent-optimizer.ts \
      rate-limit.ts token-pricing.ts auto-credentials.ts \
      navigation.ts nav-rail.tsx 2>/dev/null

# Adapters dir (MC's framework adapters)
rm -rf adapters

# Wipe MC's tests dir (we don't have converge tests yet)
rm -rf __tests__

cd /Users/minh/Documents/converge

mkdir -p .converge/studio-state
echo "Dropped MC-domain libs at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/dropped-domain-libs.txt
```

**Keep** (these are converge libs, copied in Phase 02):
- `converge-adapter/`
- `use-converge-events.ts`, `use-view-mode.ts`
- `watcher-singleton.ts`, `schedule-parser.ts`
- `run-supervisor.ts`, `ring-buffer.ts`, `session-correlator.ts`
- `utils.ts` (shadcn `cn()` helper, kept from MC fork)
- `themes.ts` (Bucket 1 theme registry)
