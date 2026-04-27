#!/usr/bin/env node
// Asserts the canonical tagline appears verbatim in:
//   1. README.md                       (source of truth — public, top-level)
//   2. apps/landing/dist/index.html    (rendered landing page)
//
// Exits non-zero if either is missing OR if they disagree.

import { existsSync, readFileSync } from 'node:fs';

const TAGLINE = 'Define done. Converge gets there.';
const SRC = 'README.md';
const RENDERED = 'apps/landing/dist/index.html';

const missing = [];
if (!existsSync(SRC)) missing.push(SRC);
if (!existsSync(RENDERED)) missing.push(RENDERED);
if (missing.length) {
  console.error(`check-tagline-drift: missing ${missing.join(', ')}`);
  process.exit(1);
}

const inSrc = readFileSync(SRC, 'utf8').includes(TAGLINE);
const inRendered = readFileSync(RENDERED, 'utf8').includes(TAGLINE);

if (!inSrc) {
  console.error(`check-tagline-drift: tagline not in ${SRC}`);
  process.exit(1);
}
if (!inRendered) {
  console.error(`check-tagline-drift: tagline not in ${RENDERED}`);
  process.exit(1);
}
console.log(`OK tagline matches in ${SRC} and ${RENDERED}`);
