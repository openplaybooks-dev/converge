---
id: 003-footer
title: Footer.astro — brand + links + copyright + license
dependencies: [001-main-layout]
inputs:
  - apps/landing/.content/brand.json
  - apps/landing/.content/sitemap.json
outputs:
  - apps/landing/src/components/layout/Footer.astro
checks:
  - id: footer-exists
    cmd: "test -f apps/landing/src/components/layout/Footer.astro"
    description: Footer.astro exists
  - id: footer-has-brand-name
    cmd: "test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'Converge' apps/landing/src/components/layout/Footer.astro"
    description: Footer mentions the brand name
  - id: footer-has-license
    cmd: "test -f apps/landing/src/components/layout/Footer.astro && grep -qE 'MIT' apps/landing/src/components/layout/Footer.astro"
    description: Footer mentions the MIT license
  - id: footer-no-screwfast
    cmd: "test -f apps/landing/src/components/layout/Footer.astro && ! grep -qiE 'screwfast|astrowind|foxi' apps/landing/src/components/layout/Footer.astro"
    description: no upstream-theme references
---

# Footer

Bottom of every page. Minimal: brand + license + tertiary nav.

## File

```astro
---
// apps/landing/src/components/layout/Footer.astro
import brand from '@/.content/brand.json' with { type: 'json' };

const year = new Date().getFullYear();
---

<footer class="border-t border-border bg-bg-elev/30 py-12 mt-24">
  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 md:grid-cols-3">
    <div>
      <p class="font-display font-bold text-text">{brand.name}</p>
      <p class="text-sm text-text-muted mt-2 max-w-sm">{brand.tagline}</p>
    </div>

    <nav class="flex flex-col gap-2 text-sm">
      <p class="text-text-dim uppercase text-xs tracking-wide font-semibold mb-2">Project</p>
      <a href="/docs/getting-started/why-converge" class="text-text-muted hover:text-text">Documentation</a>
      <a href="/blog" class="text-text-muted hover:text-text">Blog</a>
      <a href={brand.github} target="_blank" rel="noopener noreferrer" class="text-text-muted hover:text-text">GitHub</a>
    </nav>

    <nav class="flex flex-col gap-2 text-sm">
      <p class="text-text-dim uppercase text-xs tracking-wide font-semibold mb-2">Concepts</p>
      <a href="/docs/concepts/context-interpolation" class="text-text-muted hover:text-text">Context interpolation</a>
      <a href="/docs/concepts/deterministic-checks" class="text-text-muted hover:text-text">Deterministic checks</a>
      <a href="/docs/concepts/dynamic-work-breakdown" class="text-text-muted hover:text-text">Dynamic work-breakdown</a>
      <a href="/docs/concepts/self-correction" class="text-text-muted hover:text-text">Self-correction</a>
    </nav>
  </div>

  <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-dim">
    <p>© {year} Converge — MIT License</p>
    <p>Built with Converge.</p>
  </div>
</footer>
```

## Process

1. Write the file.
2. Run `astro check`.

## Banned

- Hardcoding the brand name or tagline. Read from `brand.json`.
- Adding "newsletter signup" or "company" sections. We're an open-source project, not a SaaS.
- Hardcoded year. Use `new Date().getFullYear()`.
