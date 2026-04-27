# Task: 05-build-layout/002-navigation

# Header

Top navigation bar. Sticky. Responsive. Reads brand + sitemap.

## File

```astro
---
// apps/landing/src/components/layout/Header.astro
import brand from '@/.content/brand.json' with { type: 'json' };
import { Icon } from 'astro-icon/components';
---

<header class="sticky top-0 z-50 bg-bg/80 backdrop-blur border-b border-border">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 text-text hover:text-indigo transition-colors">
      <Icon name="lucide:target" class="w-6 h-6 text-indigo" />
      <span class="font-display font-bold text-lg">{brand.name}</span>
    </a>

    <nav class="flex items-center gap-6 text-sm font-medium">
      <a href="/docs/getting-started/why-converge" class="text-text-muted hover:text-text transition-colors">Docs</a>
      <a href="/blog" class="text-text-muted hover:text-text transition-colors">Blog</a>
      <a href={brand.github} target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-text transition-colors flex items-center gap-1">
        GitHub
        <Icon name="lucide:external-link" class="w-3 h-3" />
      </a>
    </nav>
  </div>
</header>
```

## Process

1. Write the file as shown.
2. The `Icon` import requires `astro-icon` (installed in 03-design-system/005-iconography).
3. Run `astro check`.

## Banned

- Hardcoding the GitHub URL. Read from `brand.github`.
- Adding more nav items than Docs / Blog / GitHub. Keep the header focused — the home page itself has all the marketing links.
- Mobile hamburger menu for v1. With only 3 links, a flex row works on mobile too. Add the hamburger only if usability testing shows otherwise.