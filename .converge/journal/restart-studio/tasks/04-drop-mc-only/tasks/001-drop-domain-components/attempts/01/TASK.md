# Task: 04-drop-mc-only/001-drop-domain-components

Hard-delete MC-domain component trees:

```bash
rm -rf packages/studio/src/components/openclaw
rm -rf packages/studio/src/components/gateway
rm -rf packages/studio/src/components/chat
rm -rf packages/studio/src/components/onboarding
rm -f  packages/studio/src/components/layout/openclaw-doctor-banner.tsx
rm -f  packages/studio/src/components/layout/openclaw-update-banner.tsx
rm -f  packages/studio/src/components/panels/agent-comms-panel.tsx
rm -f  packages/studio/src/components/panels/agent-cost-panel.tsx
rm -f  packages/studio/src/components/panels/agent-detail-tabs.tsx
rm -f  packages/studio/src/components/panels/agent-history-panel.tsx
rm -f  packages/studio/src/components/panels/agent-squad-panel.tsx
rm -f  packages/studio/src/components/panels/agent-squad-panel-phase3.tsx
rm -f  packages/studio/src/components/modals/exec-approval-overlay.tsx
rm -f  packages/studio/src/components/panels/exec-approval-panel.tsx

# Write marker
mkdir -p .converge/studio-state
echo "Dropped MC-domain components at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/dropped-domain-components.txt
```

**Note:** `agent-detail-tabs.tsx` is the visual template Phase 03 leaf 006 cloned. After that clone, it's safe to delete the original.