#!/usr/bin/env node
// Demote an RFC to status: stale and append a backlog entry for re-ideation.
//
// Usage:
//   demote-stale-rfc.mjs --rfc <md-path> --report <citation-report.json> --backlog <jsonl>

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, basename } from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rfcContent = readFileSync(args.rfc, "utf8");

  // Flip status to stale in frontmatter
  const updated = rfcContent.replace(
    /^(status:\s*)(\w+)(\s*)$/m,
    (_, k, _v, t) => `${k}stale${t}`
  );
  writeFileSync(args.rfc, updated);

  // Append backlog entry
  if (args.backlog) {
    mkdirSync(dirname(args.backlog), { recursive: true });
    let report = { stale: [], stale_count: 0 };
    if (existsSync(args.report)) {
      try {
        report = JSON.parse(readFileSync(args.report, "utf8"));
      } catch {
        // keep defaults
      }
    }
    const entry = {
      id: `stale-rfc:${basename(args.rfc, ".md")}`,
      status: "stale",
      reason: "citations drifted >20 lines after acceptance",
      stale_citations: report.stale_count,
      rfc_path: args.rfc.replace(/^.*\/docs\//, "docs/"),
      demoted_at: new Date().toISOString(),
    };
    appendFileSync(args.backlog, JSON.stringify(entry) + "\n");
  }

  console.log(`demoted ${basename(args.rfc)} to status: stale`);
}

main();
