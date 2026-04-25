#!/usr/bin/env node
// Check if a handler in a Dart file is empty/stub.
//
// Usage:
//   node check-handler.mjs <file> --id <elementId> <handlerType>
//   node check-handler.mjs <file> <line> <handlerType>   # legacy: line is all digits
//
// Marker mode: find `// @converge:element <elementId>` then the first `<handlerType>:` within 30 lines below.
//
// Exits 0 if handler has real logic, exits 1 if empty/stub.
//
// "Empty" means:
//   - () {}
//   - () { // comment }
//   - () { block comment }
//   - (args) {}
//   - (args) { // comment }
//   - null
import { readFileSync } from 'fs';

const argv = process.argv.slice(2);
if (argv.length < 3) {
  console.error(
    'Usage: node check-handler.mjs <file> --id <elementId> <handlerType>\n' +
      '       node check-handler.mjs <file> <line> <handlerType>'
  );
  process.exit(2);
}

const [file, arg2, arg3, arg4] = argv;
let handlerType;
let lines;
let handlerStart = -1;

try {
  lines = readFileSync(file, 'utf-8').split('\n');
} catch (e) {
  console.error(`FAIL: cannot read ${file}: ${e.message}`);
  process.exit(2);
}

const fullContent = lines.join('\n');

if (arg2 === '--id') {
  const elementId = arg3;
  handlerType = arg4;
  if (!elementId || !handlerType) {
    console.error('Usage: node check-handler.mjs <file> --id <elementId> <handlerType>');
    process.exit(2);
  }
  const marker = `// @converge:element ${elementId}`;
  let markIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) {
      markIdx = i;
      break;
    }
  }
  if (markIdx === -1) {
    console.error(`FAIL: marker "${marker}" not found in ${file}`);
    process.exit(1);
  }
  const maxForward = Math.min(lines.length, markIdx + 31);
  for (let i = markIdx; i < maxForward; i++) {
    if (lines[i].includes(`${handlerType}:`)) {
      handlerStart = i;
      break;
    }
  }
  if (handlerStart === -1) {
    if (!fullContent.includes(`${handlerType}:`)) {
      console.log(`PASS: ${handlerType} not found in ${file} (removed)`);
      process.exit(0);
    }
    console.error(
      `FAIL: ${handlerType} not found within 30 lines after marker for ${elementId} in ${file}`
    );
    process.exit(1);
  }
} else {
  const lineStr = arg2;
  handlerType = arg3;
  if (!/^\d+$/.test(lineStr) || !handlerType) {
    console.error(
      'Usage: node check-handler.mjs <file> --id <elementId> <handlerType>\n' +
        '       node check-handler.mjs <file> <line> <handlerType> (line must be digits)'
    );
    process.exit(2);
  }
  const lineNum = parseInt(lineStr, 10);
  for (let i = Math.max(0, lineNum - 4); i < Math.min(lines.length, lineNum + 3); i++) {
    if (lines[i].includes(`${handlerType}:`)) {
      handlerStart = i;
      break;
    }
  }
  if (handlerStart === -1) {
    if (!fullContent.includes(`${handlerType}:`)) {
      console.log(`PASS: ${handlerType} not found in ${file} (removed)`);
      process.exit(0);
    }
    console.error(`FAIL: ${handlerType} expected near line ${lineNum} but found elsewhere in ${file}`);
    process.exit(1);
  }
}

const handlerLine = lines[handlerStart];

// Check for null handler
if (/:\s*null\s*[,;)}\]]/.test(handlerLine)) {
  console.error(`FAIL: ${handlerType} is null at ${file}:${handlerStart + 1}`);
  process.exit(1);
}

// Extract the handler body — find the opening { and matching }
// First check for single-line arrow: onTap: () => expr,
if (/=>\s*\S/.test(handlerLine)) {
  // Arrow function — check it's not just => null or => {}
  if (/=>\s*null\s*[,;)}]/.test(handlerLine)) {
    console.error(`FAIL: ${handlerType} is => null at ${file}:${handlerStart + 1}`);
    process.exit(1);
  }
  if (/=>\s*\{\s*\}\s*[,;)}]/.test(handlerLine)) {
    console.error(`FAIL: ${handlerType} is => {} at ${file}:${handlerStart + 1}`);
    process.exit(1);
  }
  console.log(`PASS: ${handlerType} has arrow body at ${file}:${handlerStart + 1}`);
  process.exit(0);
}

// Check for single-line empty: onTap: () {},  or onTap: () { },
if (/\(\s*[^)]*\)\s*\{\s*\}\s*[,;)}\]]/.test(handlerLine)) {
  console.error(`FAIL: ${handlerType} is empty {} at ${file}:${handlerStart + 1}`);
  process.exit(1);
}

// Multi-line body — extract from { to matching }
const braceStart = handlerLine.indexOf('{');
if (braceStart === -1) {
  // No brace on this line — might be on next line or missing
  // Check if it's a simple reference: onTap: _handleTap,
  if (/:\s*\w+\s*[,;)}]/.test(handlerLine.slice(handlerLine.indexOf(':')))) {
    console.log(`PASS: ${handlerType} is a method reference at ${file}:${handlerStart + 1}`);
    process.exit(0);
  }
  // Check next few lines for the brace
  let found = false;
  for (let j = handlerStart + 1; j < Math.min(lines.length, handlerStart + 3); j++) {
    if (lines[j].includes('{')) {
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`PASS: ${handlerType} appears to be a reference at ${file}:${handlerStart + 1}`);
    process.exit(0);
  }
}

// Collect the body between { and matching }
let depth = 0;
let bodyLines = [];
let started = false;

for (let i = handlerStart; i < lines.length; i++) {
  const line = lines[i];
  for (let c = 0; c < line.length; c++) {
    if (line[c] === '{') {
      if (!started) started = true;
      depth++;
    } else if (line[c] === '}') {
      depth--;
      if (started && depth === 0) {
        // Collected full body — check if it's empty
        const body = bodyLines.join('\n').trim();
        // Strip comments and whitespace
        const stripped = body
          .replace(/\/\/[^\n]*/g, '') // line comments
          .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
          .trim();

        if (stripped === '') {
          console.error(`FAIL: ${handlerType} body is empty/comment-only at ${file}:${handlerStart + 1}`);
          process.exit(1);
        }

        console.log(`PASS: ${handlerType} has real body at ${file}:${handlerStart + 1}`);
        process.exit(0);
      }
    }
  }
  if (started && i > handlerStart) {
    bodyLines.push(line);
  }
}

// If we got here, couldn't parse body — assume it's fine
console.log(`PASS: ${handlerType} body could not be fully parsed at ${file}:${handlerStart + 1} (assuming wired)`);
process.exit(0);
