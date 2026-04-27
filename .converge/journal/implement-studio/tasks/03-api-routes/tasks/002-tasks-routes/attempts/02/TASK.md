# Task: 03-api-routes/002-tasks-routes

Implement task list/read/update/reset routes. Note Next.js App Router catch-all syntax: `[...path]` produces `params.path` as `string[]` — join with `/` to get the relative `taskPath` the adapter expects.

**`tasks/route.ts`** — `GET` lists tasks under a playbook:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { listTasks } from '@/lib/converge-adapter';

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const items = await listTasks(params.name);
  return Response.json({ items });
}
```

**`tasks/[...path]/route.ts`** — `GET`/`PUT` for a single task:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { readTaskMd, writeTaskMd } from '@/lib/converge-adapter';

export async function GET(_req: Request, { params }: { params: { name: string; path: string[] } }) {
  const taskPath = params.path.join('/');
  const data = await readTaskMd(params.name, taskPath);
  return Response.json(data);
}

export async function PUT(req: Request, { params }: { params: { name: string; path: string[] } }) {
  const taskPath = params.path.join('/');
  const { frontmatter, body } = (await req.json()) as { frontmatter: Record<string, unknown>; body: string };
  await writeTaskMd(params.name, taskPath, frontmatter, body);
  return Response.json({ ok: true });
}
```

**`tasks/[...path]/reset/route.ts`** — `POST` resets the task checkpoint:

```ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { resetTask } from '@/lib/converge-adapter';

export async function POST(_req: Request, { params }: { params: { name: string; path: string[] } }) {
  await resetTask(params.name, params.path.join('/'));
  return Response.json({ ok: true });
}
```

**Validation**: reject `taskPath` containing `..` segments. Sanitize at the adapter boundary too — defense in depth.