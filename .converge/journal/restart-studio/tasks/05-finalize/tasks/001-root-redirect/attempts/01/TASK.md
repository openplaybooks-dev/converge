# Task: 05-finalize/001-root-redirect

```tsx
import { redirect } from 'next/navigation';

export default function RootPage(): never {
  redirect('/playbooks');
}
```

That's the entire file. Server-side redirect; the user never sees a flash of any other page at `/`.