#!/usr/bin/env node
// Mutate an RFC's status: field in frontmatter.
//
// Usage:
//   update-rfc-status.mjs --rfc <md-path> --status <new-status>

import { readFileSync, writeFileSync } from "node:fs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

const VALID = new Set([
  "draft",
  "accepted",
  "stale",
  "implementing",
  "implementing-needs-human",
  "shipped",
  "rejected",
]);

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!VALID.has(args.status)) {
    console.error(`invalid status: ${args.status}`);
    process.exit(2);
  }

  const content = readFileSync(args.rfc, "utf8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    console.error(`no frontmatter in ${args.rfc}`);
    process.exit(2);
  }

  const updated = content.replace(
    /^(status:\s*)(\S+)(\s*)$/m,
    (_full, k, _v, t) => `${k}${args.status}${t}`
  );

  if (updated === content) {
    // No status field — inject one
    const injected = content.replace(
      /^---\n([\s\S]*?)\n---/,
      (_, body) => `---\n${body}\nstatus: ${args.status}\n---`
    );
    writeFileSync(args.rfc, injected);
  } else {
    writeFileSync(args.rfc, updated);
  }
  console.log(`updated ${args.rfc} status → ${args.status}`);
}

main();
