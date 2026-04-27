# Checks: 02-bootstrap-astro/003-install-integrations

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## tailwind-installed
**Description**: tailwindcss (any of the 3 install styles) is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit((all['@tailwindcss/vite']||all['@astrojs/tailwind']||all['tailwindcss'])?0:1)"`

## mdx-installed
**Description**: @astrojs/mdx is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/mdx']?0:1)"`

## sitemap-installed
**Description**: @astrojs/sitemap is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/sitemap']?0:1)"`

## rss-installed
**Description**: @astrojs/rss is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/rss']?0:1)"`

## starlight-installed
**Description**: @astrojs/starlight is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/starlight']?0:1)"`

## cloudflare-adapter-installed
**Description**: @astrojs/cloudflare is in deps
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');const all={...p.dependencies,...p.devDependencies};process.exit(all['@astrojs/cloudflare']?0:1)"`

## install-completed
**Description**: pnpm install completed and astro is resolvable
**Command**: `test -f apps/landing/package.json && node -e "const p=require('./apps/landing/package.json');process.exit(p.dependencies?.astro||p.devDependencies?.astro?0:1)" && node -e "require.resolve('astro', {paths:['apps/landing']})"`