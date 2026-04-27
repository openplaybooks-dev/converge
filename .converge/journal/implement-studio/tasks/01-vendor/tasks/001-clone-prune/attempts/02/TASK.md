# Task: 01-vendor/001-clone-prune

Clone `https://github.com/builderz-labs/mission-control` into a temp directory, drop its `.git`, capture the head commit SHA, then move the contents into `packages/converge-studio/`.

**Process**:

```bash
mkdir -p /tmp/mc-fork
git clone --depth 1 https://github.com/builderz-labs/mission-control /tmp/mc-fork
cd /tmp/mc-fork
SHA=$(git rev-parse HEAD)
echo "$SHA" > UPSTREAM_SHA
rm -rf .git
mkdir -p /Users/minh/Documents/converge/packages/converge-studio
mv * /Users/minh/Documents/converge/packages/converge-studio/  # plus dotfiles
```

**Prune** (delete from `packages/converge-studio/`):

- `prisma/` (we don't use SQLite/Prisma)
- Framework-adapter directories: any `src/lib/adapters/{openclaw,crewai,langgraph,autogen}/` and corresponding API routes under `src/app/api/{openclaw,crewai,langgraph,autogen}/`
- Auth: `src/app/api/auth/**`, NextAuth config files, RBAC middleware
- Agent registry UI pages and API routes (`src/app/api/agents/**`, agent registry pages)
- Multi-tenant org/project switcher pages
- Any tests, mocks, or seeds tied to the removed code

**Keep**: app shell (`src/app/layout.tsx`), sidebar/theme components, tasks/runs/logs UI, gantt component, Tailwind config, base API plumbing (SSE/WS helpers).

If a directory is uncertain, leave it for the next task to address — better to keep extra than delete needed code.

**Outputs**: `packages/converge-studio/` populated; `packages/converge-studio/UPSTREAM_SHA` contains the upstream commit SHA.