# Task: 05-build-layout/005-error-pages

# Error pages

A friendly `/404` page. (No `/500.astro` for v1 — Astro's default 500
behavior is fine for unhandled server errors and is rare in a mostly-static
landing site anyway.)

## File

```astro
---
// apps/landing/src/pages/404.astro
import MainLayout from '@/layouts/MainLayout.astro';
---

<MainLayout title="Page not found — Converge" description="The page you're looking for doesn't exist.">
  <section class="min-h-[60vh] flex items-center justify-center px-4">
    <div class="text-center max-w-md">
      <p class="text-indigo font-mono text-sm tracking-widest uppercase">404</p>
      <h1 class="mt-4 text-4xl sm:text-5xl font-display font-bold text-text">
        Lost in the gap.
      </h1>
      <p class="mt-4 text-text-muted">
        The page you're looking for doesn't exist or has moved. Let's get you back to defined territory.
      </p>
      <a
        href="/"
        class="mt-8 inline-flex items-center gap-2 px-5 py-3 bg-indigo text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
      >
        Back to home
      </a>
    </div>
  </section>
</MainLayout>
```

## Banned

- Inventing a backstory. The page is a redirect-helper, not a marketing surface.
- Adding a sitemap dump. Users who hit 404 want to find what they were looking for, not browse — a single home link is enough.