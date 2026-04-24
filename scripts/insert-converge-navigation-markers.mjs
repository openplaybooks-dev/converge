#!/usr/bin/env node
/**
 * Backfill `// @converge:element <elementId>` in Dart files from navigations.json.
 * Usage: node scripts/insert-converge-navigation-markers.mjs <project-root>
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/insert-converge-navigation-markers.mjs <project-root>');
  process.exit(2);
}

const navPath = join(root, 'navigations.json');
const nav = JSON.parse(readFileSync(navPath, 'utf-8'));
const markerPrefix = '// @converge:element ';

function findHandlerLine(lines, type, hint0) {
  const token = `${type}:`;
  const lo = Math.max(0, hint0 - 25);
  const hi = Math.min(lines.length, hint0 + 12);
  const candidates = [];
  for (let i = lo; i < hi; i++) {
    if (lines[i].includes(token)) candidates.push(i);
  }
  if (candidates.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(token)) candidates.push(i);
    }
  }
  if (candidates.length === 0) return -1;
  let best = candidates[0];
  let bestDist = Math.abs(candidates[0] - hint0);
  for (const c of candidates) {
    const d = Math.abs(c - hint0);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best;
}

const byFile = new Map();
for (const screen of nav.screens || []) {
  for (const el of screen.elements || []) {
    if (!el.file || !el.elementId || !el.type) continue;
    const arr = byFile.get(el.file) || [];
    arr.push(el);
    byFile.set(el.file, arr);
  }
}

for (const [relFile, elements] of byFile) {
  const full = join(root, relFile);
  let lines;
  try {
    lines = readFileSync(full, 'utf-8').split('\n');
  } catch (e) {
    console.warn('Skip missing file', relFile, e.message);
    continue;
  }

  const inserts = [];
  for (const el of elements) {
    const marker = `${markerPrefix}${el.elementId}`;
    if (lines.some((l) => l.includes(marker))) continue;

    const hint0 = typeof el.line === 'number' ? el.line - 1 : 0;
    const idx = findHandlerLine(lines, el.type, hint0);
    if (idx === -1) {
      console.warn('No handler', el.type, 'for', el.elementId, 'in', relFile);
      continue;
    }
    const prevLine = idx > 0 ? lines[idx - 1] : '';
    if (prevLine.includes(marker)) continue;
    const indent = (lines[idx].match(/^\s*/) || [''])[0];
    inserts.push({ idx, marker: `${indent}${markerPrefix}${el.elementId}` });
  }

  inserts.sort((a, b) => b.idx - a.idx);
  const usedIdx = new Set();
  for (const { idx, marker } of inserts) {
    if (usedIdx.has(idx)) continue;
    usedIdx.add(idx);
    lines.splice(idx, 0, marker);
  }

  if (inserts.length > 0) {
    writeFileSync(full, lines.join('\n'));
    console.log('Updated', relFile, inserts.length, 'marker(s)');
  }
}
