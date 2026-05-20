#!/usr/bin/env node
// Top-level check: at least one Accepted RFC exists with no in-flight branch.
// Otherwise the shipping playbook idles (this check fails cleanly).

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

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

function listRfcBranches() {
  try {
    const local = execSync("git branch --list 'rfc/*'", { encoding: "utf8" });
    const localNames = local
      .split("\n")
      .map((l) => l.replace(/^\*?\s+/, "").trim())
      .filter(Boolean);
    let remoteNames = [];
    try {
      const remote = execSync("git ls-remote --heads origin 'rfc/*'", {
        encoding: "utf8",
      });
      remoteNames = remote
        .split("\n")
        .map((l) => l.split("\t")[1])
        .filter(Boolean)
        .map((r) => r.replace(/^refs\/heads\//, ""));
    } catch {
      // no remote configured — ok
    }
    return new Set([...localNames, ...remoteNames]);
  } catch {
    return new Set();
  }
}

if (!existsSync(rfcsDir)) {
  console.error("docs/rfcs not found");
  process.exit(1);
}

const branches = listRfcBranches();
let available = 0;
for (const f of readdirSync(rfcsDir)) {
  const m = f.match(/^(\d{4})-(.+)\.md$/);
  if (!m) continue;
  const content = readFileSync(join(rfcsDir, f), "utf8");
  const fm = parseFrontmatter(content);
  if (fm.status !== "accepted") continue;
  const branchName = `rfc/${m[1]}-${m[2]}`;
  if (!branches.has(branchName)) available++;
}

if (available === 0) {
  console.error("no accepted RFCs available to ship");
  process.exit(1);
}
process.exit(0);
