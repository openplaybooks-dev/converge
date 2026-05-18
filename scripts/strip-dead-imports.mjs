#!/usr/bin/env node
/**
 * Strip dead named imports flagged by `tsc --noUnusedLocals --noUnusedParameters`.
 *
 * Only touches lines that begin with `import` — never touches unused locals
 * or parameters (those need human review).
 *
 * Run from the package directory whose tsconfig you want to consult, or
 * pass --cwd <dir>.
 *
 * Usage:
 *   node scripts/strip-dead-imports.mjs                # uses cwd
 *   node scripts/strip-dead-imports.mjs --cwd packages/core
 *
 * Idempotent: re-running after a clean pass is a no-op.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve as resolvePath, join } from "node:path";

const argv = process.argv.slice(2);
let pkgCwd = process.cwd();
const cwdIdx = argv.indexOf("--cwd");
if (cwdIdx >= 0 && argv[cwdIdx + 1]) {
  pkgCwd = resolvePath(argv[cwdIdx + 1]);
}

// 1. Run tsc with the unused-locals diagnostics enabled.
let tscOutput = "";
try {
  tscOutput = execSync(
    "pnpm tsc --noEmit --noUnusedLocals --noUnusedParameters 2>&1",
    { cwd: pkgCwd, encoding: "utf-8" },
  );
} catch (err) {
  // tsc exits non-zero when it finds diagnostics. That's expected.
  tscOutput = String(err.stdout || "") + String(err.stderr || "");
}

// 2. Parse `file.ts(LINE,COL): error TS{6133,6196}: 'NAME' is declared...`
const pattern =
  /^(.+?)\((\d+),(\d+)\): error TS(6133|6196): '(.+?)' (?:is declared but its value is never read|is declared but never used)\.$/gm;

/** @type {Record<string, Record<number, Set<string>>>} */
const byFile = {};
let m;
while ((m = pattern.exec(tscOutput)) !== null) {
  const [_, file, lineStr, _col, _code, name] = m;
  const line = parseInt(lineStr, 10);
  const abs = resolvePath(pkgCwd, file);
  if (!byFile[abs]) byFile[abs] = {};
  if (!byFile[abs][line]) byFile[abs][line] = new Set();
  byFile[abs][line].add(name);
}

const fileCount = Object.keys(byFile).length;
let totalRemoved = 0;
let statementsRemoved = 0;

// 3. Edit each file in place.
for (const [absFile, byLine] of Object.entries(byFile)) {
  if (!existsSync(absFile)) continue;
  const content = readFileSync(absFile, "utf-8");
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);

  // Sort line numbers descending so deletions don't shift indices.
  const lineNums = Object.keys(byLine)
    .map(Number)
    .sort((a, b) => b - a);

  let changed = false;

  for (const lineNum of lineNums) {
    const idx = lineNum - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const original = lines[idx];

    // Only operate on import lines.
    if (!/^\s*import\b/.test(original)) continue;

    // Extract the named-imports list inside `{ ... }`.
    const braceMatch = original.match(/^(.*?\{)\s*(.*?)\s*(\}.*)$/s);
    if (!braceMatch) continue;
    const [, prefix, namesPart, suffix] = braceMatch;

    // Split the named-imports list, preserving `type` prefix where present.
    const items = namesPart
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const namesToRemove = byLine[lineNum];
    const kept = items.filter((item) => {
      // `type Foo`, `Foo as Bar`, or just `Foo` — match the imported identifier.
      // For `Foo as Bar`, the local name (Bar) is what TS reports as unused.
      const idMatch = item.match(/^(?:type\s+)?(?:\w+\s+as\s+)?(\w+)$/);
      if (!idMatch) return true; // weird shape — keep
      const local = idMatch[1];
      // For `Foo as Bar`, the local name is what matters; but we also support
      // the simpler case where the imported name IS the local name.
      const asMatch = item.match(/^(?:type\s+)?(\w+)\s+as\s+(\w+)$/);
      const checkAgainst = asMatch ? asMatch[2] : local;
      if (namesToRemove.has(checkAgainst)) {
        totalRemoved++;
        return false;
      }
      return true;
    });

    if (kept.length === items.length) continue; // nothing removed
    changed = true;

    if (kept.length === 0) {
      // No named imports left. Check if there's also a default or namespace
      // import on this line — e.g. `import foo, { unused } from "..."` or
      // `import * as ns, { unused } from "..."` (the latter is syntactically
      // invalid in ESM but be safe).
      // The prefix captured by braceMatch is like `import foo, { ` or `import { `.
      const hasDefaultOrNs = /^\s*import\s+\S+\s*,\s*\{/.test(prefix);
      if (hasDefaultOrNs) {
        // Strip just the named-imports clause, keep the default import.
        // e.g. `import foo, { } from "..."` → `import foo from "..."`
        lines[idx] = prefix.replace(/,\s*\{\s*$/, "") + suffix.replace(/^\}\s*/, "");
      } else {
        // Pure named-imports statement — delete the line.
        lines.splice(idx, 1);
        statementsRemoved++;
      }
    } else {
      lines[idx] = `${prefix} ${kept.join(", ")} ${suffix}`;
    }
  }

  if (changed) {
    writeFileSync(absFile, lines.join(eol), "utf-8");
  }
}

console.log(
  `cleaned ${fileCount} file(s); removed ${totalRemoved} named import(s); deleted ${statementsRemoved} empty import statement(s).`,
);
