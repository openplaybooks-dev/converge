#!/usr/bin/env node
/**
 * Check that the selected correction target is NOT in the escalated bugs list.
 * Usage: node check-escalated-target.mjs <correction-spec.json> <escalated.json>
 * Exit 0 = target is NOT escalated (safe to proceed)
 * Exit 1 = target IS escalated (blocked)
 */
import { readFileSync, existsSync } from "node:fs";

const specPath = process.argv[2];
const escalatedPath = process.argv[3];

if (!specPath) {
  console.error("Usage: node check-escalated-target.mjs <correction-spec.json> <escalated.json>");
  process.exit(1);
}

const spec = JSON.parse(readFileSync(specPath, "utf-8"));
const findingId = spec.finding_id;
if (!findingId) {
  console.error("ERROR: correction-spec.json missing finding_id");
  process.exit(1);
}

if (!existsSync(escalatedPath)) {
  console.log(`OK: no escalated.json — finding "${findingId}" is not blocked`);
  process.exit(0);
}

const escalated = JSON.parse(readFileSync(escalatedPath, "utf-8"));

// Check by exact ID match
const byId = escalated.find((e) => e.id === findingId);
if (byId) {
  console.error(`BLOCKED: Finding "${findingId}" is escalated (since epoch ${byId.first_epoch}): ${byId.reason}`);
  process.exit(1);
}

// Check by file pattern — if any escalated entry's files overlap with selected files
const selectedFiles = new Set(spec.files_to_change || []);
for (const entry of escalated) {
  const escalatedFiles = new Set(entry.files || []);
  for (const sf of selectedFiles) {
    for (const ef of escalatedFiles) {
      if (sf === ef || sf.startsWith(ef) || ef.startsWith(sf)) {
        console.error(`BLOCKED: Target file "${sf}" matches escalated entry "${entry.id}" (file "${ef}"): ${entry.reason}`);
        process.exit(1);
      }
    }
  }
}

console.log(`OK: Finding "${findingId}" is not in escalated.json`);
process.exit(0);
