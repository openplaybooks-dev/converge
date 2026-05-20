#!/usr/bin/env node
// Deterministically pick the next Accepted RFC.
// Sort: priority_tier ASC, estimate (days) ASC, accepted_at ASC.
// Express lane: top-of-queue `type: chore` may bundle up to 5 chores.
//
// Usage:
//   pick-accepted-rfc.mjs --rfcs-dir <dir> --project-dir <root> --out <path>

import {
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const TIER_ORDER = {
  critical: 0,
  tier0: 1,
  tier1: 2,
  tier2: 3,
  tier3: 4,
};
const CHORE_BATCH_MAX = 5;
const CHORE_BATCH_LOC_MAX = 50;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

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

function estimateDays(s) {
  if (!s) return 999;
  const m = String(s).match(/(\d+(?:\.\d+)?)/);
  if (!m) return 999;
  const n = parseFloat(m[1]);
  if (/week/i.test(s)) return n * 7;
  if (/hour/i.test(s)) return n / 8;
  return n;
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
      // ok
    }
    return new Set([...localNames, ...remoteNames]);
  } catch {
    return new Set();
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rfcsDir = args.rfcsDir ?? args["rfcs-dir"];

  mkdirSync(dirname(args.out), { recursive: true });

  const branches = listRfcBranches();

  const accepted = [];
  for (const f of readdirSync(rfcsDir)) {
    const m = f.match(/^(\d{4})-(.+)\.md$/);
    if (!m) continue;
    const content = readFileSync(join(rfcsDir, f), "utf8");
    const fm = parseFrontmatter(content);
    if (fm.status !== "accepted") continue;
    const branchName = `rfc/${m[1]}-${m[2]}`;
    if (branches.has(branchName)) continue;
    accepted.push({
      number: m[1],
      slug: m[2],
      path: `docs/rfcs/${f}`,
      title: fm.title ?? "(no title)",
      type: fm.type ?? "fix",
      priority_tier: fm.priority_tier ?? "tier2",
      estimate: fm.estimate ?? "?",
      estimate_days: estimateDays(fm.estimate),
      risk: fm.risk ?? "low",
      accepted_at: fm.accepted_at ?? "9999-01-01T00:00:00Z",
    });
  }

  if (accepted.length === 0) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          outcome: "none-available",
          rfcs: [],
          branch_name: null,
          deterministic_hash: null,
        },
        null,
        2
      )
    );
    return;
  }

  accepted.sort((a, b) => {
    const t = (TIER_ORDER[a.priority_tier] ?? 99) - (TIER_ORDER[b.priority_tier] ?? 99);
    if (t !== 0) return t;
    const e = a.estimate_days - b.estimate_days;
    if (e !== 0) return e;
    return a.accepted_at.localeCompare(b.accepted_at);
  });

  const top = accepted[0];
  const hash = createHash("sha1")
    .update(accepted.map((r) => r.number).join(","))
    .digest("hex")
    .slice(0, 16);

  // Express lane: if top is chore, bundle up to N consecutive chores
  if (top.type === "chore") {
    const batch = [];
    for (const r of accepted) {
      if (r.type !== "chore") break;
      if (batch.length >= CHORE_BATCH_MAX) break;
      batch.push(r);
    }
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          outcome: "chore-batch",
          rfcs: batch,
          branch_name: `rfc/chore-batch-${Date.now()}`,
          deterministic_hash: hash,
          batch_loc_ceiling: CHORE_BATCH_LOC_MAX,
        },
        null,
        2
      )
    );
    return;
  }

  writeFileSync(
    args.out,
    JSON.stringify(
      {
        outcome: "picked",
        rfcs: [top],
        branch_name: `rfc/${top.number}-${top.slug}`,
        deterministic_hash: hash,
      },
      null,
      2
    )
  );
}

main();
