#!/usr/bin/env node
// Verify that high-risk files are only changed when the RFC declares risk: high.
//
// Usage:
//   check-high-risk-marker.mjs <project-dir> <selected-rfc.json>

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const HIGH_RISK_GLOBS = [
  /^packages\/core\/src\/orchestrator\/spawn.*\.ts$/,
  /^packages\/core\/src\/seed\/cli-spawn\.ts$/,
  /^packages\/core\/src\/run\/index\.ts$/,
];

const [projectDir, selectedPath] = process.argv.slice(2);

const selected = JSON.parse(readFileSync(selectedPath, "utf8"));

let diff;
try {
  diff = execSync("git diff --name-only", {
    cwd: projectDir,
    encoding: "utf8",
  });
} catch {
  process.exit(0);
}

const changed = diff.split("\n").map((l) => l.trim()).filter(Boolean);
const highRiskTouched = changed.filter((f) =>
  HIGH_RISK_GLOBS.some((re) => re.test(f))
);

if (highRiskTouched.length === 0) process.exit(0);

const rfcRisk = selected.rfcs?.[0]?.risk ?? "low";
if (rfcRisk === "high") {
  console.log(
    `high-risk files changed (${highRiskTouched.length}) and RFC declares risk: high — ok`
  );
  process.exit(0);
}

console.error("high-risk files changed but RFC does not declare risk: high:");
for (const f of highRiskTouched) console.error(`  ${f}`);
console.error(
  "  → either restrict the change, or update the RFC frontmatter to risk: high and re-accept"
);
process.exit(1);
