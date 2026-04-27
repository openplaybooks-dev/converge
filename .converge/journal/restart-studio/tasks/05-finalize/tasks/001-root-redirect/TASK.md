---
id: 001-root-redirect
title: Make / redirect to /playbooks
outputs:
  - packages/studio/src/app/page.tsx
checks:
  - id: page-exists
    description: src/app/page.tsx exists
    cmd: "test -f packages/studio/src/app/page.tsx"
  - id: redirect-to-playbooks
    description: page.tsx redirects to /playbooks
    cmd: "grep -q 'next/navigation' packages/studio/src/app/page.tsx && grep -q 'redirect' packages/studio/src/app/page.tsx && grep -q '/playbooks' packages/studio/src/app/page.tsx"
---

```tsx
import { redirect } from 'next/navigation';

export default function RootPage(): never {
  redirect('/playbooks');
}
```

That's the entire file. Server-side redirect; the user never sees a flash of any other page at `/`.
