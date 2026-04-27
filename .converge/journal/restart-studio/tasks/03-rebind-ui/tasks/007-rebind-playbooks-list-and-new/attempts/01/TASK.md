# Task: 03-rebind-ui/007-rebind-playbooks-list-and-new

**`/playbooks/page.tsx`** (list):
- Server-render `listPlaybooks()`
- Card grid (or table — match MC's existing visual treatment for list views): name, description, mode, task count, last-run time, status pill
- Each card → `/playbooks/<name>`
- Top-right "+ New playbook" button → `/playbooks/new`
- Empty state: `<EmptyStateLaunchpad>` with "Create your first playbook" CTA

**`/playbooks/new/page.tsx`** (form):
- Form fields: name (required, lowercase-slug), description, inputs[] (repeatable), run config (mode select, maxTaskAttempts, maxDuration, resume checkbox)
- Submit → `POST /api/playbooks` with NewPlaybookSpec JSON
- On 201 → redirect to `/playbooks/<name>`
- On 4xx → render error inline

Use MC's form primitives (input/select/textarea — already in `src/components/ui/`). Match MC's card padding and density.