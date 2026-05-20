#!/usr/bin/env node
// Verify the patch manifest's file list matches `git diff --name-only` exactly.
//
// Usage:
//   check-manifest-matches-diff.mjs <project-dir> <manifest-path>

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const [projectDir, manifestPath] = process.argv.slice(2);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

// Short-circuit: cannot-apply with no files is fine if diff is also empty
const declaredFiles = new Set(manifest.files ?? []);

let diff;
try {
  diff = execSync("git diff --name-only", {
    cwd: projectDir,
    encoding: "utf8",
  });
} catch (err) {
  console.error("git diff failed:", err.message);
  process.exit(1);
}

const actualFiles = new Set(
  diff.split("\n").map((l) => l.trim()).filter(Boolean)
);

const missingFromManifest = [...actualFiles].filter((f) => !declaredFiles.has(f));
const extraInManifest = [...declaredFiles].filter((f) => !actualFiles.has(f));

if (missingFromManifest.length === 0 && extraInManifest.length === 0) {
  process.exit(0);
}

console.error("patch manifest does not match git diff:");
if (missingFromManifest.length > 0) {
  console.error("  files in git diff but not in manifest:");
  for (const f of missingFromManifest) console.error(`    ${f}`);
}
if (extraInManifest.length > 0) {
  console.error("  files in manifest but not in git diff:");
  for (const f of extraInManifest) console.error(`    ${f}`);
}
process.exit(1);
