# Task: 03-api-routes/005-delete-removed-routes

Delete API routes brought in from upstream that we don't use. Phase 01 already pruned at fork time, but anything missed should be cleaned up here.

**Delete**:
- `src/app/api/agents/**` — agent registry, heartbeats, capability sync
- `src/app/api/auth/**` — NextAuth routes (no auth in MVP)
- `src/app/api/{openclaw,crewai,langgraph,autogen}/**` — framework adapter routes
- `src/app/api/orgs/**`, `src/app/api/users/**` — multi-tenant + user mgmt if present
- `src/app/api/cost/**` if it depends on a removed cost ledger (otherwise keep, leave dormant)

**Process**:
1. List `src/app/api/` directories.
2. For each, check whether it's referenced by any kept UI page (grep). If unreferenced and matches the delete list above, remove it.
3. Run `pnpm --filter @converge/studio typecheck` after deletions; fix dangling imports in kept code by either re-routing to converge-adapter or stubbing.

**Do not delete**: `api/playbooks`, `api/runs`, `api/watch`, `api/run` (Phase 05). These are the converge surface.