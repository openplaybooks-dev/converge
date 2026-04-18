#!/usr/bin/env node
/**
 * grep shim — portable drop-in for GNU/BSD grep in converge check commands.
 *
 * Supports the flags used in TASK.md checks:
 *   -q / --quiet / --silent   suppress output; exit 0 if match found
 *   -i / --ignore-case        case-insensitive matching
 *   -c / --count              print match count instead of lines
 *   -n / --line-number        prefix each output line with line number
 *   -l / --files-with-matches print only filenames that contain a match
 *   -L / --files-without-match print only filenames with no match
 *   -v / --invert-match       select non-matching lines
 *   -E / --extended-regexp    pattern is an extended regex (same as default in JS)
 *   -F / --fixed-strings      pattern is a literal string (no regex)
 *   --                        end of flags; next arg is the pattern
 *
 * Usage (same as grep):
 *   node grep.js [flags] <pattern> <file...>
 *
 * Exit codes:
 *   0  — at least one match found (or: -L with no matches in file)
 *   1  — no match found
 *   2  — usage/IO error
 */

import { readFileSync } from "node:fs";

/* ------------------------------------------------------------------ */
/*  Argument parsing                                                   */
/* ------------------------------------------------------------------ */

const argv = process.argv.slice(2);

let quiet = false;
let ignoreCase = false;
let countOnly = false;
let lineNumbers = false;
let filesWithMatches = false;
let filesWithoutMatch = false;
let invertMatch = false;
let fixedStrings = false;
let endOfFlags = false;
let pattern: string | null = null;
const files: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];

  if (endOfFlags || !arg.startsWith("-") || arg === "-") {
    // First non-flag is the pattern, rest are files
    if (pattern === null) {
      pattern = arg;
    } else {
      files.push(arg);
    }
    continue;
  }

  if (arg === "--") {
    endOfFlags = true;
    continue;
  }

  // Long flags
  if (arg.startsWith("--")) {
    switch (arg) {
      case "--quiet":
      case "--silent":
        quiet = true;
        break;
      case "--ignore-case":
        ignoreCase = true;
        break;
      case "--count":
        countOnly = true;
        break;
      case "--line-number":
        lineNumbers = true;
        break;
      case "--files-with-matches":
        filesWithMatches = true;
        break;
      case "--files-without-match":
        filesWithoutMatch = true;
        break;
      case "--invert-match":
        invertMatch = true;
        break;
      case "--extended-regexp":
        break; // default in JS anyway
      case "--fixed-strings":
        fixedStrings = true;
        break;
      default:
        process.stderr.write(`grep: unknown option: ${arg}\n`);
    }
    continue;
  }

  // Short flags (possibly combined: -qi, -qn, etc.)
  for (const ch of arg.slice(1)) {
    switch (ch) {
      case "q":
        quiet = true;
        break;
      case "i":
        ignoreCase = true;
        break;
      case "c":
        countOnly = true;
        break;
      case "n":
        lineNumbers = true;
        break;
      case "l":
        filesWithMatches = true;
        break;
      case "L":
        filesWithoutMatch = true;
        break;
      case "v":
        invertMatch = true;
        break;
      case "E":
        break; // default in JS
      case "F":
        fixedStrings = true;
        break;
      default:
        process.stderr.write(`grep: invalid option -- '${ch}'\n`);
    }
  }
}

if (pattern === null) {
  process.stderr.write("grep: missing pattern\n");
  process.exit(2);
}

if (files.length === 0) {
  process.stderr.write("grep: no files specified\n");
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/*  Build regex                                                        */
/* ------------------------------------------------------------------ */

let regex: RegExp;
try {
  const src = fixedStrings
    ? pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    : pattern;
  regex = new RegExp(src, ignoreCase ? "gi" : "g");
} catch {
  // Invalid regex — fall back to literal match
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  regex = new RegExp(escaped, ignoreCase ? "gi" : "g");
}

/* ------------------------------------------------------------------ */
/*  Process files                                                      */
/* ------------------------------------------------------------------ */

let anyMatch = false;
const multiFile = files.length > 1;

for (const file of files) {
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch (err: any) {
    process.stderr.write(`grep: ${file}: ${err.message}\n`);
    continue;
  }

  const lines = content.split("\n");
  let fileMatchCount = 0;

  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    regex.lastIndex = 0;
    const matched = regex.test(line);
    const selected = invertMatch ? !matched : matched;

    if (selected) {
      fileMatchCount++;
      anyMatch = true;

      if (!quiet && !countOnly && !filesWithMatches && !filesWithoutMatch) {
        const filePfx = multiFile ? `${file}:` : "";
        const linePfx = lineNumbers ? `${ln + 1}:` : "";
        process.stdout.write(`${filePfx}${linePfx}${line}\n`);
      }
    }
  }

  if (filesWithMatches && fileMatchCount > 0) {
    process.stdout.write(`${file}\n`);
  }
  if (filesWithoutMatch && fileMatchCount === 0) {
    process.stdout.write(`${file}\n`);
    anyMatch = true; // -L: "matched" means file had no lines matching
  }
  if (countOnly) {
    const filePfx = multiFile ? `${file}:` : "";
    process.stdout.write(`${filePfx}${fileMatchCount}\n`);
    if (fileMatchCount > 0) anyMatch = true;
  }
}

process.exit(anyMatch ? 0 : 1);
