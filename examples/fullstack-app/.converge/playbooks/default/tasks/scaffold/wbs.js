export async function run(ctx) {
  await ctx.spawn({
    id: '001-backend',
    title: 'Create backend server',
    outputs: ['src/server.ts'],
    checks: [
      { id: 'server-exists', cmd: 'test -f src/server.ts' }
    ],
    body: 'Create `src/server.ts` with a minimal HTTP server that listens on port 3000 and responds with `{ "status": "ok" }`.'
  });

  await ctx.spawn({
    id: '002-frontend',
    title: 'Create frontend app',
    dependencies: ['001-backend'],
    outputs: ['src/app.ts'],
    checks: [
      { id: 'app-exists', cmd: 'test -f src/app.ts' }
    ],
    body: 'Create `src/app.ts` with a minimal frontend that fetches from the backend API and renders the response.'
  });
}
