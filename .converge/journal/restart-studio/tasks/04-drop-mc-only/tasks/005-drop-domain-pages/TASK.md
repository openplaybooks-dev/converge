---
id: 005-drop-domain-pages
title: Drop MC-domain top-level pages and the [[...panel]] catch-all
outputs:
  - .converge/studio-state/dropped-domain-pages.txt
checks:
  - id: catchall-gone
    description: The [[...panel]] catch-all is gone
    cmd: "test ! -d 'packages/studio/src/app/[[...panel]]'"
  - id: agent-pages-gone
    description: No agent/orgs/users pages
    cmd: "test ! -d packages/studio/src/app/agents && test ! -d packages/studio/src/app/orgs && test ! -d packages/studio/src/app/users"
  - id: marker-written
    description: A marker file recording the drop is written
    cmd: "test -f .converge/studio-state/dropped-domain-pages.txt"
---

```bash
cd packages/studio/src/app
# Drop the legacy MC catch-all home page
rm -rf '[[...panel]]'
# Drop agent/multi-tenant pages if any
rm -rf agents orgs users rbac
# Drop MC-only standalone pages
rm -rf docs setup login
cd /Users/minh/Documents/converge

mkdir -p .converge/studio-state
echo "Dropped MC-domain top-level pages at $(date -u +%Y-%m-%dT%H:%M:%SZ)" > .converge/studio-state/dropped-domain-pages.txt
```

**Keep:** `playbooks/`, `runs/`, `settings/`, `audit/` (if Phase 03 leaf 008 didn't put settings here yet — that's fine; the page gets created), and `api/` (already filtered in 004).
