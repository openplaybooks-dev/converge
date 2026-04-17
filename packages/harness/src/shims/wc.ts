#!/usr/bin/env node
/**
 * wc shim — portable drop-in for wc in harness check commands.
 *
 * Supports:
 *   -l   count newlines (lines)
 *   -c   count bytes
 *   -w   count words
 *   -m   count characters
 *
 * Reads from files given as arguments, or from stdin if no files given.
 * Shell redirects still work:  node wc.js -l < file.txt
 *
 * Output matches GNU wc format:  <count>[ <filename>]
 * Multi-file: prints per-file lines + a "total" line.
 *
 * Exit code: always 0 on success.
 */

import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);

let countLines = false;
let countBytes = false;
let countWords = false;
let countChars = false;
const files: string[] = [];

for (const arg of argv) {
  if (!arg.startsWith('-') || arg === '-') {
    files.push(arg);
    continue;
  }
  if (arg.startsWith('--')) {
    switch (arg) {
      case '--lines': countLines = true; break;
      case '--bytes': countBytes = true; break;
      case '--words': countWords = true; break;
      case '--chars': countChars = true; break;
    }
    continue;
  }
  for (const ch of arg.slice(1)) {
    switch (ch) {
      case 'l': countLines = true; break;
      case 'c': countBytes = true; break;
      case 'w': countWords = true; break;
      case 'm': countChars = true; break;
      default:
        process.stderr.write(`wc: invalid option -- '${ch}'\n`);
    }
  }
}

// Default: count lines, words, bytes (like GNU wc with no flags)
if (!countLines && !countBytes && !countWords && !countChars) {
  countLines = true;
  countWords = true;
  countBytes = true;
}

interface Counts { lines: number; words: number; bytes: number; chars: number }

function countContent(content: string, rawBuf: Buffer): Counts {
  const lines = (content.match(/\n/g) ?? []).length;
  const words = (content.match(/\S+/g) ?? []).length;
  return { lines, words, bytes: rawBuf.length, chars: content.length };
}

function formatCounts(c: Counts, name?: string): string {
  const parts: string[] = [];
  if (countLines) parts.push(String(c.lines).padStart(7));
  if (countWords) parts.push(String(c.words).padStart(7));
  if (countBytes) parts.push(String(c.bytes).padStart(7));
  if (countChars) parts.push(String(c.chars).padStart(7));
  return parts.join('') + (name ? ` ${name}` : '') + '\n';
}

function readStdin(): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function main() {
  if (files.length === 0 || (files.length === 1 && files[0] === '-')) {
    // Read from stdin
    const buf = await readStdin();
    const text = buf.toString('utf8');
    const c = countContent(text, buf);
    process.stdout.write(formatCounts(c));
    return;
  }

  const totals: Counts = { lines: 0, words: 0, bytes: 0, chars: 0 };

  for (const file of files) {
    let buf: Buffer;
    try {
      buf = readFileSync(file);
    } catch (err: any) {
      process.stderr.write(`wc: ${file}: ${err.message}\n`);
      continue;
    }
    const text = buf.toString('utf8');
    const c = countContent(text, buf);
    totals.lines += c.lines;
    totals.words += c.words;
    totals.bytes += c.bytes;
    totals.chars += c.chars;
    process.stdout.write(formatCounts(c, file));
  }

  if (files.length > 1) {
    process.stdout.write(formatCounts(totals, 'total'));
  }
}

main().catch((err) => {
  process.stderr.write(`wc: ${err.message}\n`);
  process.exit(2);
});
