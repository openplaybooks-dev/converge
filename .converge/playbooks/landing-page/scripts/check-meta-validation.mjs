#!/usr/bin/env node
// Validates that the home page has all required meta tags for SEO and social
// sharing. Catches the failure mode where the layout exists but Head.astro
// is empty / malformed / forgot key tags.
//
// Required:
//   - <html lang="..."> (non-empty)
//   - <title> (non-empty, not the default "Astro" or "ScrewFast")
//   - <meta name="description" content="..."> (non-empty)
//   - <link rel="canonical" href="..."> (non-empty)
//   - <meta property="og:title" content="...">
//   - <meta property="og:description" content="...">
//   - <meta property="og:image" content="...">
//   - <meta name="twitter:card" content="..."> (any value)
//
// Uses regex against the raw HTML — keeps the script dependency-free.
// Exits 0 if all pass, 1 with a list of missing/empty tags.

import { existsSync, readFileSync } from 'node:fs';

const TARGET = 'apps/landing/dist/index.html';

if (!existsSync(TARGET)) {
  console.error(`check-meta-validation: ${TARGET} does not exist. Run a build first.`);
  process.exit(1);
}

const html = readFileSync(TARGET, 'utf-8');

const failures = [];

function check(name, pattern, validate = (m) => m && m[1] && m[1].trim().length > 0) {
  const m = html.match(pattern);
  if (!validate(m)) failures.push({ name, captured: m ? m[1] : null });
  else if (m && m[1]) console.log(`  ok ${name}: ${m[1].slice(0, 60)}${m[1].length > 60 ? '…' : ''}`);
}

// <html lang="...">
check('html-lang', /<html[^>]*\blang="([^"]+)"/i);

// <title>NonEmpty</title>  — must NOT be the Astro default or any forked-theme name
check('title', /<title>([^<]+)<\/title>/i, (m) => {
  if (!m || !m[1]) return false;
  const t = m[1].trim();
  if (t.length === 0) return false;
  const banned = ['Astro', 'ScrewFast', 'AstroWind', 'Foxi', 'AstroPaper', 'Astroship'];
  return !banned.some((b) => t === b || t.startsWith(b + ' ') || t.endsWith(' ' + b));
});

// <meta name="description" content="...">
check('meta-description', /<meta\s+name="description"\s+content="([^"]+)"/i);

// <link rel="canonical" href="...">
check('canonical', /<link\s+rel="canonical"\s+href="([^"]+)"/i);

// OG tags
check('og-title', /<meta\s+property="og:title"\s+content="([^"]+)"/i);
check('og-description', /<meta\s+property="og:description"\s+content="([^"]+)"/i);
check('og-image', /<meta\s+property="og:image"\s+content="([^"]+)"/i);

// Twitter card
check('twitter-card', /<meta\s+name="twitter:card"\s+content="([^"]+)"/i);

if (failures.length > 0) {
  console.error('\ncheck-meta-validation: missing or empty meta tags:');
  for (const f of failures) {
    console.error(`  ✗ ${f.name}${f.captured !== null ? ` (got: ${JSON.stringify(f.captured)})` : ' (not found)'}`);
  }
  process.exit(1);
}

console.log(`\nOK all required meta tags present in ${TARGET}`);
process.exit(0);
