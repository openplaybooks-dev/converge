---
id: 001-main-layout
title: MainLayout.astro — wraps every page with Head + Header + Footer + brand-driven body
inputs:
  - apps/landing/.content/brand.json
  - apps/landing/.content/seo.json
outputs:
  - apps/landing/src/layouts/MainLayout.astro
checks:
  - id: layout-exists
    cmd: "test -f apps/landing/src/layouts/MainLayout.astro"
    description: MainLayout.astro exists
  - id: layout-imports-head
    cmd: "test -f apps/landing/src/layouts/MainLayout.astro && grep -qE \"import\\s+Head\" apps/landing/src/layouts/MainLayout.astro"
    description: imports Head component
  - id: layout-reads-seo-json
    cmd: "test -f apps/landing/src/layouts/MainLayout.astro && grep -qE \"\\.content/seo\\.json|seo\\.json\" apps/landing/src/layouts/MainLayout.astro"
    description: reads seo.json (directly or via Head)
  - id: layout-no-screwfast
    cmd: "test -f apps/landing/src/layouts/MainLayout.astro && ! grep -qiE 'screwfast|astrowind|foxi|sitedata|siteData' apps/landing/src/layouts/MainLayout.astro"
    description: no upstream-theme references
  - id: layout-imports-globals
    cmd: "test -f apps/landing/src/layouts/MainLayout.astro && grep -qE \"globals\\.css|tokens\\.css\" apps/landing/src/layouts/MainLayout.astro"
    description: imports globals.css (or tokens.css directly)
---

# MainLayout

Every page in the site uses this layout (the home, blog listing, blog
posts, error pages — Starlight has its own internal layout for `/docs/*`).

## File

```astro
---
// apps/landing/src/layouts/MainLayout.astro
import '@/styles/globals.css';
import Head from '@/components/layout/Head.astro';
import Header from '@/components/layout/Header.astro';
import Footer from '@/components/layout/Footer.astro';
import seo from '@/.content/seo.json' with { type: 'json' };

interface Props {
  /** Page key matching seo.pages — defaults to 'home' */
  page?: keyof typeof seo.pages;
  /** Override title (else seo.pages[page].title) */
  title?: string;
  /** Override description */
  description?: string;
  /** Override OG image */
  ogImage?: string;
}

const { page = 'home', title, description, ogImage } = Astro.props;
const meta = seo.pages[page] ?? seo.pages.home;
---

<!DOCTYPE html>
<html lang="en">
  <Head
    title={title ?? meta.title}
    description={description ?? meta.description}
    ogImage={ogImage ?? meta.ogImage}
    canonical={Astro.url.href}
  />
  <body class="min-h-screen bg-bg text-text antialiased">
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

## Process

1. Write the file as shown above. The `Head`, `Header`, and `Footer` components are stubs at this point — they'll be created in tasks 002–004.
2. The `Head` import path may need to be adjusted depending on TS path aliases (default Astro scaffold uses `@/...` if you set the path alias, otherwise relative `../components/...`).
3. Run `pnpm --filter @converge/landing astro check` — it will warn that Head/Header/Footer don't exist yet. That's fine; the next 3 tasks create them.

## Banned

- Hardcoding any branding (title, description, OG path) inline. Always source from `seo.json` via the `meta` derivation above.
- Importing from anywhere named `siteData.json` / `data_files/`. Those are upstream-theme conventions; we use `.content/`.
- Adding `lang="..."` other than `en` for v1. Internationalization is out of scope.
