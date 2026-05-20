#!/usr/bin/env node
// Top-level check: fail if the Accepted RFC queue is > 10 (back-pressure).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const LIMIT = 10;
const rfcsDir = join(process.cwd(), "docs/rfcs");

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

if (!existsSync(rfcsDir)) process.exit(0);

let count = 0;
for (const f of readdirSync(rfcsDir)) {
  if (!/^\d{4}-.+\.md$/.test(f)) continue;
  const content = readFileSync(join(rfcsDir, f), "utf8");
  const fm = parseFrontmatter(content);
  if (fm.status === "accepted") count++;
}

if (count > LIMIT) {
  console.error(`Accepted RFC queue size ${count} exceeds limit ${LIMIT}`);
  process.exit(1);
}
process.exit(0);
