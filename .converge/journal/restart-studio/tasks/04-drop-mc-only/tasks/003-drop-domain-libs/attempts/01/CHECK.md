# Checks: 04-drop-mc-only/003-drop-domain-libs

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## domain-libs-gone
**Description**: gateway-*, openclaw-*, websocket-*, agent-* lib files are gone
**Command**: `test -z "$(ls packages/studio/src/lib/gateway-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/openclaw-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/websocket*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/agent-*.ts 2>/dev/null)" && test -z "$(ls packages/studio/src/lib/onboarding-*.ts 2>/dev/null)"`

## marker-written
**Description**: A marker file recording the drop is written
**Command**: `test -f .converge/studio-state/dropped-domain-libs.txt`