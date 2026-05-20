#!/usr/bin/env node
// Extract the ## Implementation steps section from an RFC as structured JSON.
//
// Usage:
//   parse-impl-steps.mjs --rfc <md-path> --out <json>

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const content = readFileSync(args.rfc, "utf8");
  mkdirSync(dirname(args.out), { recursive: true });

  const m = content.match(/^## Implementation steps\s*\n([\s\S]*?)(?=\n## |\n# |$)/m);
  if (!m) {
    writeFileSync(
      args.out,
      JSON.stringify({ steps: [], raw: "", warning: "no implementation steps section found" }, null, 2)
    );
    return;
  }

  const raw = m[1].trim();

  // Parse numbered or bulleted list items as steps
  const steps = [];
  let current = null;
  for (const line of raw.split("\n")) {
    const itemMatch = line.match(/^\s*(?:\d+\.|[-*])\s+(.+)$/);
    if (itemMatch) {
      if (current) steps.push(current);
      current = { text: itemMatch[1].trim(), continuation: [] };
    } else if (current && line.trim() && /^\s{2,}/.test(line)) {
      current.continuation.push(line.trim());
    }
  }
  if (current) steps.push(current);

  writeFileSync(
    args.out,
    JSON.stringify(
      {
        steps: steps.map((s, i) => ({
          n: i + 1,
          text: s.text,
          notes: s.continuation.join(" "),
        })),
        raw,
      },
      null,
      2
    )
  );
}

main();
