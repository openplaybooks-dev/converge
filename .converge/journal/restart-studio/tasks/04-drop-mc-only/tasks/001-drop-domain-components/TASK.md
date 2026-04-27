---
id: 001-drop-domain-components
title: Drop MC-domain component trees (openclaw, gateway, agent, chat, exec-approval, onboarding)
outputs:
  - .converge/studio-state/dropped-domain-components.txt
checks:
  - id: openclaw-gone
    description: openclaw component trees are gone
    cmd: "test ! -d packages/studio/src/components/openclaw && test -z \"$(ls packages/studio/src/components/layout/openclaw-* 2>/dev/null)\""
  - id: gateway-gone
    description: gateway component trees are gone
    cmd: "test ! -d packages/studio/src/components/gateway"
  - id: agent-and-chat-gone
    description: agent panels and chat tree are gone
    cmd: "test -z \"$(ls packages/studio/src/components/panels/agent-* 2>/dev/null)\" && test ! -d packages/studio/src/components/chat"
  - id: exec-approval-and-onboarding-gone
    description: exec-approval and onboarding trees are gone
    cmd: "test -z \"$(ls packages/studio/src/components/modals/exec-approval-* 2>/dev/null)\" && test -z \"$(ls packages/studio/src/components/panels/exec-approval-* 2>/dev/null)\" && test ! -d packages/studio/src/components/onboarding"
  - id: marker-written
    description: A marker file recording the drop is written
    cmd: "test -f .converge/studio-state/dropped-domain-components.txt"
---

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
