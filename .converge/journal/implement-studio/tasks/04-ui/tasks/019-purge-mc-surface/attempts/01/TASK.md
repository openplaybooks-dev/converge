# Task: 04-ui/019-purge-mc-surface

Hard-delete every Mission Control surface that survived earlier prune passes. The acceptance gate is binary: each listed directory/file MUST be gone, the API route surface MUST be reduced to the converge-native subset.

**Routes to delete:**
- `src/app/[[...panel]]/` — the legacy MC catch-all that currently renders the Launch Sequence dashboard at `/`. Whole directory.
- Any `src/app/(studio)/agents/`, `(studio)/skills/`, `(studio)/office/`, `(studio)/memory/`, `(studio)/inbox/` if they exist.

**Components to delete (whole directories):**
- `src/components/dashboard/` — fleet/launchpad/sessions-list/widgets.
- `src/components/panels/` — every panel that the catch-all routed to (~30 files, all MC-specific).
- `src/components/modals/` — exec-approval, project-manager, etc.
- `src/components/hud/` — heads-up display widgets.
- `src/components/terminal/` — pty terminal.
- `src/components/chat/` — agent-comms chat.
- `src/components/onboarding/` — launch-sequence wizard.

**Layout files to delete (one-by-one, leave the directory):**
- `src/components/layout/nav-rail.tsx`
- `src/components/layout/header-bar.tsx`
- `src/components/layout/live-feed.tsx`
- `src/components/layout/site-header.tsx`
- `src/components/layout/local-mode-banner.tsx`
- `src/components/layout/update-banner.tsx`
- `src/components/layout/promo-banner.tsx`
- `src/components/layout/openclaw-doctor-banner.tsx`
- `src/components/layout/openclaw-update-banner.tsx`

**Lib files to delete (glob-style):**
- `src/lib/gateway-*.ts`
- `src/lib/openclaw-*.ts`
- `src/lib/onboarding-*.ts`
- `src/lib/pty-*.ts`
- `src/lib/websocket-*.ts`, `src/lib/websocket.ts`
- `src/lib/use-server-events.ts` (replaced by `use-converge-events.ts`)

**API routes to delete — keep ONLY these top-level dirs in `src/app/api/`:**
- `playbooks/`
- `runs/`
- `run/`
- `watch/`
- `events/`

**Delete every other directory under `src/app/api/`**, including: `activities`, `adapters`, `agent-runtimes`, `alerts`, `audit`, `backup`, `channels`, `chat`, `claude`, `claude-tasks`, `cleanup`, `connect`, `cron`, `debug`, `diagnostics`, `docs`, `exec-approvals`, `export`, `frameworks`, `gateway-config`, `gateways`, `github`, `gnap`, `hermes`, `index`, `integrations`, `local`, `logs`, `mcp-audit`, `memory`, `mentions`, `nodes`, `notifications`, `onboarding`, `pipelines`, `projects`, `pty`, `quality-review`, `releases`, `schedule-parse`, `scheduler`, `search`, `security-audit`, `security-scan`, `sessions`, `settings`, `setup`, `skills`, `spawn`, `standup`, `status`, `super`, `system-monitor`, `tasks`, `tokens`, `v1`, `webhooks`, `workflows`, `workload`, `workspaces`.

(If any of these are absent, that's fine — the check just enforces the *positive* allowlist.)

**Process:**
1. Delete every directory and file listed above.
2. Run `pnpm --filter @converge/studio typecheck`. There WILL be dangling imports — the previous shell, page modules, and several lib files import from the deleted MC code. Resolve each by:
   - **If the importer is itself MC-only** → delete the importer too.
   - **If the importer is converge-native** (e.g. `(studio)/playbooks/page.tsx`) → strip the import and inline-or-stub the symbol.
3. Repeat 2 until typecheck returns `0`.
4. Re-run all the manifest checks; every one must pass.

**Do not** keep any "compatibility shim" or "deprecated re-export" — the goal is zero MC code in the tree.