---
id: 001-playbooks-routes
title: /api/playbooks routes (list, create, read, update)
outputs:
  - packages/converge-studio/src/app/api/playbooks/route.ts
  - packages/converge-studio/src/app/api/playbooks/[name]/route.ts
checks:
  - id: routes-exist
    description: Both route handlers exist
    cmd: "test -f packages/converge-studio/src/app/api/playbooks/route.ts && test -f 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts'"
  - id: nodejs-runtime
    description: Both routes export runtime = 'nodejs'
    cmd: "grep -l \"runtime = 'nodejs'\" packages/converge-studio/src/app/api/playbooks/route.ts 'packages/converge-studio/src/app/api/playbooks/[name]/route.ts' | wc -l | xargs test 2 -eq"
  - id: typecheck
    description: Routes typecheck
    cmd: "pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
---

Implement the playbook collection and item routes.

**`src/app/api/playbooks/route.ts`**:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listPlaybooks, createPlaybook, type NewPlaybookSpec }
  from '@/lib/converge-adapter';

export async function GET() {
  const items = await listPlaybooks();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as NewPlaybookSpec;
  // validate name shape, required fields
  await createPlaybook(body);
  return NextResponse.json({ ok: true, name: body.name }, { status: 201 });
}
```

**`src/app/api/playbooks/[name]/route.ts`**:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { readPlaybook, writePlaybook } from '@/lib/converge-adapter';

export async function GET(_req: NextRequest, { params }: { params: { name: string } }) {
  const { raw, parsed } = await readPlaybook(params.name);
  return NextResponse.json({ raw, parsed });
}

export async function PUT(req: NextRequest, { params }: { params: { name: string } }) {
  const { yaml } = (await req.json()) as { yaml: string };
  await writePlaybook(params.name, yaml);
  return NextResponse.json({ ok: true });
}
```

**Error handling**: wrap handlers in a small helper that catches errors, returns 4xx for validation errors (e.g. invalid YAML, name conflict) and 5xx for unexpected. Mission Control likely already has such a helper — use it if so, otherwise inline a small `withErrorHandling`.

**Path alias** `@/` should already be configured in `tsconfig.json` from the upstream Mission Control. If not, add `"paths": { "@/*": ["./src/*"] }`.
