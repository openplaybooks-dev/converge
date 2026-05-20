#!/usr/bin/env node
// Atomically assign the next RFC number and move the draft into docs/rfcs/.
// Uses a lockfile (advisory) to prevent concurrent-epoch collisions.
// Also enforces back-pressure: fails if Accepted queue > 10.
//
// Usage:
//   claim-next-rfc-number.mjs --draft <md> --triage <json> --rfcs-dir <dir>
//                             --lock <lockfile> --out <result.json>

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  renameSync,
  openSync,
  closeSync,
  appendFileSync,
} from "node:fs";
import { join, dirname, relative } from "node:path";
import { execSync } from "node:child_process";

const BACKPRESSURE_LIMIT = 10;
const LOCK_WAIT_MS = 30_000;
const LOCK_POLL_MS = 200;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

async function acquireLock(lockPath) {
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      const fd = openSync(lockPath, "wx");
      closeSync(fd);
      return;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
    }
  }
  throw new Error(`timed out acquiring ${lockPath}`);
}

function releaseLock(lockPath) {
  try {
    execSync(`rm -f "${lockPath}"`);
  } catch {
    // best-effort
  }
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

function nextNumber(rfcsDir) {
  let max = 0;
  for (const f of readdirSync(rfcsDir)) {
    const m = f.match(/^(\d{4})-.+\.md$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return String(max + 1).padStart(4, "0");
}

function countAcceptedPending(rfcsDir) {
  let count = 0;
  for (const f of readdirSync(rfcsDir)) {
    if (!/^\d{4}-.+\.md$/.test(f)) continue;
    const content = readFileSync(join(rfcsDir, f), "utf8");
    const fm = parseFrontmatter(content);
    if (fm.status === "accepted") count++;
  }
  return count;
}

function tierSection(tier) {
  switch (tier) {
    case "critical":
      return "### **CRITICAL**";
    case "tier0":
      return "### Tier 0 (survival";
    case "tier1":
      return "### Tier 1 (AI-agent friendliness)";
    case "tier2":
      return "### Tier 2 (DX)";
    case "tier3":
      return "### Tier 3 (long-term contract polish)";
    default:
      return "### Tier 2 (DX)";
  }
}

function appendIndexRow(readmePath, rfcNumber, title, slug, tier, estimate) {
  if (!existsSync(readmePath)) return;
  const lines = readFileSync(readmePath, "utf8").split("\n");
  const header = tierSection(tier);
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(header)) {
      // Find the table within this section
      for (let j = i + 1; j < lines.length && !lines[j].startsWith("### "); j++) {
        if (lines[j].startsWith("|") && lines[j + 1]?.startsWith("|---")) {
          // Skip header + separator, find first non-table line
          let k = j + 2;
          while (k < lines.length && lines[k].startsWith("|")) k++;
          insertAt = k;
          break;
        }
      }
      break;
    }
  }
  if (insertAt < 0) return; // header not found, don't corrupt the file

  const fileName = `${rfcNumber}-${slug}.md`;
  const num = parseInt(rfcNumber, 10);
  const row = `| ${num} | ${title} | [${fileName}](${fileName}) | ${estimate} |`;
  lines.splice(insertAt, 0, row);
  writeFileSync(readmePath, lines.join("\n"));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  mkdirSync(dirname(args.out), { recursive: true });

  // Short-circuit: empty draft
  if (!existsSync(args.draft) || readFileSync(args.draft).length === 0) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          outcome: "skipped",
          reason: "no-draft",
          rfc_number: null,
          rfc_path: null,
        },
        null,
        2
      )
    );
    return;
  }

  await acquireLock(args.lock);
  try {
    // Back-pressure check
    const acceptedCount = countAcceptedPending(args.rfcsDir ?? args["rfcs-dir"]);
    if (acceptedCount > BACKPRESSURE_LIMIT) {
      writeFileSync(
        args.out,
        JSON.stringify(
          {
            outcome: "backpressure",
            accepted_pending_count: acceptedCount,
            reason: "acceptance queue overloaded",
            rfc_number: null,
            rfc_path: null,
          },
          null,
          2
        )
      );
      process.exitCode = 1;
      return;
    }

    const triage = JSON.parse(readFileSync(args.triage, "utf8"));
    const draftContent = readFileSync(args.draft, "utf8");
    const fm = parseFrontmatter(draftContent);

    const rfcNumber = nextNumber(args.rfcsDir ?? args["rfcs-dir"]);
    const slug =
      (triage.candidate?.hash ?? "").slice(0, 8) || `epoch${Date.now()}`;
    const fileName = `${rfcNumber}-${slug}.md`;
    const newPath = join(args.rfcsDir ?? args["rfcs-dir"], fileName);

    renameSync(args.draft, newPath);

    // Append index row in README
    const readmePath = join(args.rfcsDir ?? args["rfcs-dir"], "README.md");
    const title = fm.title ?? "(no title)";
    const tier = fm.priority_tier ?? "tier2";
    const estimate = fm.estimate ?? "?";
    appendIndexRow(readmePath, rfcNumber, title, slug, tier, estimate);

    writeFileSync(
      args.out,
      JSON.stringify(
        {
          outcome: "indexed",
          rfc_number: rfcNumber,
          rfc_slug: slug,
          rfc_path: relative(process.cwd(), newPath),
          priority_tier: tier,
          type: fm.type ?? null,
          title,
        },
        null,
        2
      )
    );
  } finally {
    releaseLock(args.lock);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
