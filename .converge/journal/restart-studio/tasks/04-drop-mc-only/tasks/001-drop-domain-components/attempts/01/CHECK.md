# Checks: 04-drop-mc-only/001-drop-domain-components

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## openclaw-gone
**Description**: openclaw component trees are gone
**Command**: `test ! -d packages/studio/src/components/openclaw && test -z "$(ls packages/studio/src/components/layout/openclaw-* 2>/dev/null)"`

## gateway-gone
**Description**: gateway component trees are gone
**Command**: `test ! -d packages/studio/src/components/gateway`

## agent-and-chat-gone
**Description**: agent panels and chat tree are gone
**Command**: `test -z "$(ls packages/studio/src/components/panels/agent-* 2>/dev/null)" && test ! -d packages/studio/src/components/chat`

## exec-approval-and-onboarding-gone
**Description**: exec-approval and onboarding trees are gone
**Command**: `test -z "$(ls packages/studio/src/components/modals/exec-approval-* 2>/dev/null)" && test -z "$(ls packages/studio/src/components/panels/exec-approval-* 2>/dev/null)" && test ! -d packages/studio/src/components/onboarding`

## marker-written
**Description**: A marker file recording the drop is written
**Command**: `test -f .converge/studio-state/dropped-domain-components.txt`