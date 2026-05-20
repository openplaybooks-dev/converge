#!/usr/bin/env node
// When a PR is opened, the corresponding RFC's status must be
// implementing | implementing-needs-human.
//
// Usage:
//   check-rfc-status-flipped.mjs <pr.json> <selected-rfc.json> <project-dir>

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [prPath, selectedPath, projectDir] = process.argv.slice(2);

const pr = JSON.parse(readFileSync(prPath, "utf8"));

// Only enforce when PR was opened
if (pr.outcome !== "opened") process.exit(0);

const selected = JSON.parse(readFileSync(selectedPath, "utf8"));
const rfcPaths = (selected.rfcs ?? []).map((r) => join(projectDir, r.path));

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return fm;
}

let allOk = true;
for (const p of rfcPaths) {
  if (!existsSync(p)) {
    console.error(`RFC not found: ${p}`);
    allOk = false;
    continue;
  }
  const fm = parseFrontmatter(readFileSync(p, "utf8"));
  if (
    fm.status !== "implementing" &&
    fm.status !== "implementing-needs-human"
  ) {
    console.error(
      `RFC ${p} status is ${fm.status}, expected implementing or implementing-needs-human`
    );
    allOk = false;
  }
}

process.exit(allOk ? 0 : 1);
