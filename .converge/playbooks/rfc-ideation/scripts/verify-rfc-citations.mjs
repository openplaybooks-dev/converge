#!/usr/bin/env node
// Verify every path:line citation in an RFC against the current tree.
// Tolerance 0 → line must exist in current HEAD.
// Tolerance > 0 → line must be within ±N of expected position (used by shipping).
//
// Usage:
//   verify-rfc-citations.mjs --draft <md-path> --project-dir <root> --tolerance <int> --out <path>

import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join, dirname, isAbsolute } from "node:path";

const CITATION_RE =
  /\b((?:[a-zA-Z0-9_\-]+\/)*[a-zA-Z0-9_\-.]+\.(?:ts|tsx|js|mjs|cjs|md|yml|yaml|json|sh)):(\d+)\b/g;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function fileLineCount(path) {
  try {
    const data = readFileSync(path, "utf8");
    return data.split("\n").length;
  } catch {
    return 0;
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectDir = args.projectDir ?? args["project-dir"];
  const tolerance = parseInt(args.tolerance ?? "0", 10);

  mkdirSync(dirname(args.out), { recursive: true });

  if (!existsSync(args.draft)) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          skipped: true,
          reason: "draft-missing",
          checked: 0,
          stale_count: 0,
          stale: [],
        },
        null,
        2
      )
    );
    return;
  }

  let stat;
  try {
    stat = statSync(args.draft);
  } catch {
    stat = { size: 0 };
  }
  if (!stat.size) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          skipped: true,
          reason: "draft-empty",
          checked: 0,
          stale_count: 0,
          stale: [],
        },
        null,
        2
      )
    );
    return;
  }

  const draft = readFileSync(args.draft, "utf8");

  // Strip frontmatter for citation extraction
  const body = draft.replace(/^---\n[\s\S]*?\n---\n?/, "");

  const citations = [];
  let m;
  while ((m = CITATION_RE.exec(body)) !== null) {
    citations.push({ path: m[1], line: parseInt(m[2], 10), match: m[0] });
  }

  const valid = [];
  const stale = [];
  for (const c of citations) {
    const absPath = isAbsolute(c.path) ? c.path : join(projectDir, c.path);
    if (!existsSync(absPath)) {
      stale.push({ ...c, reason: "file-not-found" });
      continue;
    }
    const lineCount = fileLineCount(absPath);
    const within =
      tolerance === 0
        ? c.line >= 1 && c.line <= lineCount
        : c.line >= 1 - tolerance && c.line <= lineCount + tolerance;
    if (within) {
      valid.push({ path: c.path, line: c.line, exists: true });
    } else {
      stale.push({
        ...c,
        reason: `line-out-of-range (file has ${lineCount} lines)`,
      });
    }
  }

  writeFileSync(
    args.out,
    JSON.stringify(
      {
        skipped: false,
        checked: citations.length,
        valid,
        stale,
        stale_count: stale.length,
        tolerance,
      },
      null,
      2
    )
  );

  if (stale.length > 0) process.exit(1);
}

main();
