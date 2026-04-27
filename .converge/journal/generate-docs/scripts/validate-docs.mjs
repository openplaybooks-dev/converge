#!/usr/bin/env node
// Cross-validates every doc page against its declared `sources:`.
//
// Mechanical pass (this script): verify every source file in every page's
// frontmatter exists on disk. If a doc page declares
// `sources: [packages/cli/src/commands/run.ts]` and that file is missing,
// the source has been renamed or deleted and the doc is stale.
//
// AI pass (10-cross-validate task body): the agent re-reads each source
// and checks that the page's claims still hold. This script is the cheap
// pre-flight; the AI pass is the deeper check.
//
// Usage: node validate-docs.mjs [--ai]  (--ai is informational; AI work happens in the task body)
// Exits non-zero if any source path is missing.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const findings = { missingSource: [], emptyPage: [], stalePages: [] };
let pages = 0;

for await (const path of glob('docs/**/*.md', { cwd: process.cwd() })) {
  if (path.startsWith('docs/_internal/')) continue;
  if (path === 'docs/index.md') continue;
  pages += 1;

  const text = readFileSync(path, 'utf8');
  if (text.trim().length < 200) {
    findings.emptyPage.push(path);
    continue;
  }

  const fm = parseFrontmatter(text);
  const sources = fm?.sources ?? [];
  if (sources.length === 0) continue;  // check-frontmatter sources covers this

  for (const src of sources) {
    if (!existsSync(src)) {
      // Accept glob paths in sources (e.g. examples/*/.converge/playbooks/*/playbook.yml)
      if (src.includes('*')) {
        let hasMatch = false;
        for await (const _ of glob(src)) { hasMatch = true; break; }
        if (hasMatch) continue;
      }
      // Accept both examples/*/playbooks/*/playbook.yml and examples/*/playbooks/playbook.yml
      if (src.startsWith('examples/') && src.endsWith('/playbook.yml')) {
        const topLevel = src.replace(/\/playbooks\/[^/]+\/playbook\.yml$/, '/playbooks/playbook.yml');
        if (existsSync(topLevel)) continue;
      }
      findings.missingSource.push(`${path} → missing ${src}`);
      continue;
    }
    // Staleness heuristic: source modified after the page was written.
    // Not a hard fail — the page may have been refreshed; flag for review.
    try {
      const pageMtime = statSync(path).mtimeMs;
      const srcMtime = statSync(src).mtimeMs;
      if (srcMtime > pageMtime + 60_000) {
        findings.stalePages.push(`${path} (last refreshed ${humanAge(pageMtime)}) ← ${src} (modified ${humanAge(srcMtime)})`);
      }
    } catch { /* ignore stat errors */ }
  }
}

const hardFail = findings.missingSource.length > 0 || findings.emptyPage.length > 0;

if (findings.missingSource.length) {
  console.error(`\nvalidate-docs: ${findings.missingSource.length} pages reference missing sources:`);
  for (const f of findings.missingSource) console.error(`  ✗ ${f}`);
}
if (findings.emptyPage.length) {
  console.error(`\nvalidate-docs: ${findings.emptyPage.length} pages have <200 chars of content:`);
  for (const f of findings.emptyPage) console.error(`  ✗ ${f}`);
}
if (findings.stalePages.length) {
  // Warning only — surface but don't fail the build.
  console.warn(`\nvalidate-docs: ${findings.stalePages.length} pages may be stale (source modified after page):`);
  for (const f of findings.stalePages.slice(0, 20)) console.warn(`  ⚠ ${f}`);
  if (findings.stalePages.length > 20) console.warn(`  ... and ${findings.stalePages.length - 20} more`);
}

if (hardFail) {
  console.error(`\nFAIL: validate-docs found unrecoverable issues across ${pages} pages.`);
  process.exit(1);
}
console.log(`OK validate-docs: ${pages} pages, all sources resolve` +
  (findings.stalePages.length ? `, ${findings.stalePages.length} potentially stale (warning)` : ''));

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const out = {};
  let key = null;
  for (const line of block.split('\n')) {
    const m = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (m) {
      key = m[1];
      const v = m[2].trim();
      out[key] = v === '' || v === '|' || v === '>' ? '' : (v === '[]' ? [] : unquote(v));
      continue;
    }
    const li = line.match(/^\s+-\s+(.+)$/);
    if (li && key) {
      if (!Array.isArray(out[key])) out[key] = [];
      out[key].push(unquote(li[1].trim()));
    }
  }
  return out;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function humanAge(ts) {
  const ageMs = Date.now() - ts;
  const min = Math.round(ageMs / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.round(hr / 24)}d ago`;
}
