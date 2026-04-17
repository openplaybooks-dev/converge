#!/usr/bin/env node
/**
 * jq shim — portable subset of jq for harness check commands.
 *
 * Handles the patterns that appear in TASK.md checks:
 *   jq '.'                    validate + pretty-print
 *   jq 'empty'                validate JSON (no output)
 *   jq '.key'                 get top-level key
 *   jq '.key.nested'          nested path
 *   jq '.key[0]'              array index
 *   jq '.key | length'        pipe to built-in
 *   jq '.key | type'          pipe to type
 *   jq 'has("key")'           key existence
 *   jq 'keys'                 list keys
 *   jq 'length'               root length
 *   jq '.key == "value"'      equality (used with -e)
 *   jq '.key != "value"'      inequality (used with -e)
 *   jq '.[] | .key'           map over array
 *   jq -r '.key'              raw output (no quotes)
 *   jq -e '.key'              exit 1 if result is false/null
 *
 * Input file is the last positional argument, or stdin if none.
 *
 * Exit codes:
 *   0  — success (or: -e and result is not false/null)
 *   1  — -e and result is false or null
 *   2  — usage / parse error
 *   3  — compile error (unsupported filter)
 */

import { readFileSync } from 'node:fs';

/* ------------------------------------------------------------------ */
/*  Argument parsing                                                   */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);

let rawOutput = false;   // -r: print strings without quotes
let exitStatus = false;  // -e: exit 1 if result is false/null
let compact = false;     // -c: compact output (ignored — we use JSON.stringify)
let filter: string | null = null;
let inputFile: string | null = null;

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    switch (arg) {
      case '--raw-output': rawOutput = true; break;
      case '--exit-status': exitStatus = true; break;
      case '--compact-output': compact = true; break;
      case '--null-input': break; // ignore
    }
    continue;
  }
  if (arg.startsWith('-') && arg !== '-') {
    for (const ch of arg.slice(1)) {
      switch (ch) {
        case 'r': rawOutput = true; break;
        case 'e': exitStatus = true; break;
        case 'c': compact = true; break;
        case 'n': break; // null-input, ignore
        default:
          process.stderr.write(`jq: unknown flag: -${ch}\n`);
      }
    }
    continue;
  }
  // First positional = filter, second = file
  if (filter === null) {
    filter = arg;
  } else {
    inputFile = arg;
  }
}

if (filter === null) {
  process.stderr.write('jq: missing filter\n');
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/*  Read input                                                         */
/* ------------------------------------------------------------------ */

function readStdin(): Promise<Buffer> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (c: Buffer) => chunks.push(c));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

/* ------------------------------------------------------------------ */
/*  Filter engine                                                      */
/* ------------------------------------------------------------------ */

type JqValue = unknown;

/** Find the outermost ' | ' that is not inside brackets/parens/quotes. */
function findTopLevelPipe(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length - 2; i++) {
    const c = s[i];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') depth--;
    else if (depth === 0 && s[i] === '|' && s[i - 1] === ' ' && s[i + 1] === ' ') {
      return i;
    }
  }
  return -1;
}

/** Parse a jq literal value: string, number, boolean, null. */
function parseLiteral(s: string): JqValue {
  s = s.trim();
  if (s === 'null') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  const n = Number(s);
  if (!isNaN(n)) return n;
  return s;
}

/** Access a dotted path like `.key.nested[0]` on a value. */
function accessPath(data: JqValue, path: string): JqValue {
  if (path === '' || path === '.') return data;

  // .[] — iterate (returns array of values; caller handles)
  if (path === '[]') {
    if (Array.isArray(data)) return data;
    if (data !== null && typeof data === 'object') return Object.values(data as object);
    return [];
  }

  // Strip leading dot if present
  if (path.startsWith('.')) path = path.slice(1);

  if (path === '') return data;

  // Split on first . or [
  const dotIdx = path.indexOf('.');
  const bracketIdx = path.indexOf('[');

  // key only (no nested path)
  if (dotIdx === -1 && bracketIdx === -1) {
    if (data === null || typeof data !== 'object') return null;
    return (data as Record<string, JqValue>)[path] ?? null;
  }

  // Bracket first: key[N] or [N]
  if (bracketIdx !== -1 && (dotIdx === -1 || bracketIdx < dotIdx)) {
    const key = path.slice(0, bracketIdx);
    const closeBracket = path.indexOf(']', bracketIdx);
    const indexStr = path.slice(bracketIdx + 1, closeBracket);
    const rest = path.slice(closeBracket + 1).replace(/^\./, '');

    let current: JqValue = data;
    if (key) {
      current = accessPath(data, key);
    }
    // Array index or object key in brackets
    if (Array.isArray(current)) {
      const idx = parseInt(indexStr, 10);
      current = isNaN(idx) ? null : (current[idx < 0 ? current.length + idx : idx] ?? null);
    } else if (current !== null && typeof current === 'object') {
      const k = indexStr.replace(/^["']|["']$/g, '');
      current = (current as Record<string, JqValue>)[k] ?? null;
    } else {
      current = null;
    }
    return rest ? accessPath(current, rest) : current;
  }

  // Dot first: key.rest
  const key = path.slice(0, dotIdx);
  const rest = path.slice(dotIdx + 1);
  const next = accessPath(data, key);
  return accessPath(next, rest);
}

function applyFilter(data: JqValue, f: string): JqValue {
  f = f.trim();

  // Identity / validate
  if (f === '.' || f === 'empty') return data;

  // Pipe: split at top-level ' | '
  const pipeIdx = findTopLevelPipe(f);
  if (pipeIdx >= 0) {
    const left = f.slice(0, pipeIdx).trim();
    const right = f.slice(pipeIdx + 2).trim();
    const mid = applyFilter(data, left);
    // .[] produces an array that pipes element-wise
    if (left === '.[]' || left === '[]') {
      if (Array.isArray(mid)) {
        return mid.map(item => applyFilter(item, right));
      }
    }
    return applyFilter(mid, right);
  }

  // Builtins (no leading dot)
  if (f === 'length') {
    if (Array.isArray(data)) return data.length;
    if (typeof data === 'string') return data.length;
    if (data !== null && typeof data === 'object') return Object.keys(data as object).length;
    if (data === null) return 0;
    return 0;
  }
  if (f === 'keys') {
    if (Array.isArray(data)) return data.map((_, i) => i);
    if (data !== null && typeof data === 'object') return Object.keys(data as object).sort();
    return [];
  }
  if (f === 'keys_unsorted') {
    if (data !== null && typeof data === 'object') return Object.keys(data as object);
    return [];
  }
  if (f === 'values') {
    if (Array.isArray(data)) return data;
    if (data !== null && typeof data === 'object') return Object.values(data as object);
    return [];
  }
  if (f === 'type') {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }
  if (f === 'not') return !data;
  if (f === 'any') return Array.isArray(data) && data.some(Boolean);
  if (f === 'all') return Array.isArray(data) && data.every(Boolean);
  if (f === 'flatten') return Array.isArray(data) ? data.flat(Infinity) : data;
  if (f === 'first') return Array.isArray(data) ? data[0] : data;
  if (f === 'last') return Array.isArray(data) ? data[data.length - 1] : data;
  if (f === 'to_entries') {
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
      return Object.entries(data as object).map(([k, v]) => ({ key: k, value: v }));
    }
    return [];
  }

  // has("key") / in(obj)
  const hasMatch = f.match(/^has\(["'](.+?)["']\)$/);
  if (hasMatch) {
    const key = hasMatch[1];
    if (Array.isArray(data)) return parseInt(key, 10) < data.length;
    return data !== null && typeof data === 'object' && key in (data as object);
  }

  // contains(val)
  const containsMatch = f.match(/^contains\((.+)\)$/);
  if (containsMatch) {
    const val = parseLiteral(containsMatch[1]);
    if (typeof data === 'string' && typeof val === 'string') return data.includes(val);
    if (Array.isArray(data)) return Array.isArray(val) ? val.every(v => data.includes(v)) : data.includes(val);
    return false;
  }

  // select(expr) — pass through if truthy, drop if falsy
  const selectMatch = f.match(/^select\((.+)\)$/);
  if (selectMatch) {
    const result = applyFilter(data, selectMatch[1]);
    return result ? data : undefined;
  }

  // map(expr)
  const mapMatch = f.match(/^map\((.+)\)$/);
  if (mapMatch) {
    if (!Array.isArray(data)) return [];
    return data.map(item => applyFilter(item, mapMatch[1])).filter(v => v !== undefined);
  }

  // Equality: expr == val / expr != val
  const eqMatch = f.match(/^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (eqMatch) {
    const lv = applyFilter(data, eqMatch[1].trim());
    const rv = parseLiteral(eqMatch[3].trim());
    switch (eqMatch[2]) {
      case '==': return lv === rv;
      case '!=': return lv !== rv;
      case '>':  return (lv as number) > (rv as number);
      case '<':  return (lv as number) < (rv as number);
      case '>=': return (lv as number) >= (rv as number);
      case '<=': return (lv as number) <= (rv as number);
    }
  }

  // Path access: starts with . or .[]
  if (f.startsWith('.')) {
    return accessPath(data, f);
  }

  throw new Error(`Unsupported filter: ${f}`);
}

/* ------------------------------------------------------------------ */
/*  Output formatting                                                  */
/* ------------------------------------------------------------------ */

function formatValue(v: JqValue): string {
  if (v === undefined) return '';
  if (rawOutput && typeof v === 'string') return v + '\n';
  return JSON.stringify(v, null, compact ? 0 : 2) + '\n';
}

function isFalsy(v: JqValue): boolean {
  return v === null || v === false;
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  let raw: string;
  if (inputFile) {
    try {
      raw = readFileSync(inputFile, 'utf8');
    } catch (err: any) {
      process.stderr.write(`jq: ${inputFile}: ${err.message}\n`);
      process.exit(2);
    }
  } else {
    const buf = await readStdin();
    raw = buf.toString('utf8');
  }

  let data: JqValue;
  try {
    data = JSON.parse(raw);
  } catch (err: any) {
    process.stderr.write(`jq: parse error: ${err.message}\n`);
    process.exit(2);
  }

  let result: JqValue;
  try {
    result = applyFilter(data, filter!);
  } catch (err: any) {
    process.stderr.write(`jq: ${err.message}\n`);
    process.exit(3);
  }

  if (result === undefined) {
    // select() dropped the value
    if (exitStatus) process.exit(1);
    return;
  }

  // Flatten top-level arrays from .[] iteration into separate outputs
  const outputs: JqValue[] = Array.isArray(result) && filter!.includes('.[]')
    ? result as JqValue[]
    : [result];

  for (const out of outputs) {
    const line = formatValue(out);
    if (line) process.stdout.write(line);
  }

  if (exitStatus && outputs.every(isFalsy)) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`jq: ${err.message}\n`);
  process.exit(2);
});
