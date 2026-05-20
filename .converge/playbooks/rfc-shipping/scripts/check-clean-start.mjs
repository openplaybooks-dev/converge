#!/usr/bin/env node
// Verify the non-artifact working tree is clean before an autonomous run.
// "Non-artifact" excludes .converge/{artifacts,journal,locks} which the
// framework owns and writes to.

import { execFileSync } from "node:child_process";

const [projectDir = process.cwd()] = process.argv.slice(2);

function gitLines(args) {
  return execFileSync("git", ["-C", projectDir, ...args], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

const tracked = gitLines(["diff", "--name-only"]);
const staged = gitLines(["diff", "--cached", "--name-only"]);
const untracked = gitLines(["ls-files", "--others", "--exclude-standard"]);
let committed = [];
try {
  committed = gitLines(["diff", "HEAD~1", "--name-only"]);
} catch {
  // shallow clone or first commit — fine
}

const dirty = [...new Set([...tracked, ...staged, ...untracked, ...committed])]
  .filter((f) => !f.startsWith(".converge/artifacts/"))
  .filter((f) => !f.startsWith(".converge/journal/"))
  .filter((f) => !f.startsWith(".converge/locks/"))
  .sort();

if (dirty.length) {
  console.error(
    "autonomous run requires a clean non-artifact working tree before starting:"
  );
  for (const f of dirty) console.error(`- ${f}`);
  process.exit(1);
}
