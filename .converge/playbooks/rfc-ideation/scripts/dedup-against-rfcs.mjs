#!/usr/bin/env node
// Dedup a selected candidate against existing docs/rfcs/*.md.
// Jaccard similarity on normalized word sets of Problem sections.
//
// Usage:
//   dedup-against-rfcs.mjs --selected <path> --rfcs-dir <dir> --out <path>

import {
  readFileSync,
  readdirSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { join, dirname } from "node:path";

const JACCARD_THRESHOLD = 0.5;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function normalize(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
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

function extractProblem(content) {
  const m = content.match(/^## Problem\s*\n([\s\S]*?)(?=\n## |\n# |$)/m);
  return m ? m[1] : content.slice(0, 2000);
}

function proposeTypeAndTier(candidate) {
  const src = candidate.source;
  const labels = (candidate.labels ?? []).map((l) =>
    typeof l === "string" ? l : l.name
  );
  if (labels.includes("bug")) return { type: "fix", priority_tier: "tier1" };
  if (labels.includes("enhancement"))
    return { type: "feat", priority_tier: "tier2" };
  if (src === "code-finding") {
    const sev = candidate.body?.match(/"severity"\s*:\s*"high"/) ? "tier0" : "tier1";
    return { type: "fix", priority_tier: sev };
  }
  if (src === "idea") return { type: "feat", priority_tier: "tier2" };
  if (src === "backlog") return { type: "refactor", priority_tier: "tier2" };
  return { type: "fix", priority_tier: "tier2" };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const selected = JSON.parse(readFileSync(args.selected, "utf8"));

  mkdirSync(dirname(args.out), { recursive: true });

  // Short-circuit: empty selection
  if (!selected || selected.source === "none" || !selected.ref) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          decision: "invalid",
          candidate: selected,
          matched_rfc: null,
          reason: "no-candidate-selected",
          proposed_type: null,
          proposed_priority_tier: null,
        },
        null,
        2
      )
    );
    return;
  }

  // Validity checks
  if (!selected.summary || selected.summary.length < 10) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          decision: "invalid",
          candidate: selected,
          matched_rfc: null,
          reason: "summary too short",
          proposed_type: null,
          proposed_priority_tier: null,
        },
        null,
        2
      )
    );
    return;
  }
  if (!selected.body || selected.body.length < 50) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          decision: "invalid",
          candidate: selected,
          matched_rfc: null,
          reason: "body too short",
          proposed_type: null,
          proposed_priority_tier: null,
        },
        null,
        2
      )
    );
    return;
  }

  // Dedup
  const candidateTokens = normalize(selected.body);
  let bestMatch = null;
  let bestScore = 0;
  if (existsSync(args.rfcsDir ?? args["rfcs-dir"])) {
    const dir = args.rfcsDir ?? args["rfcs-dir"];
    for (const file of readdirSync(dir)) {
      if (!/^\d{4}-.+\.md$/.test(file)) continue;
      const content = readFileSync(join(dir, file), "utf8");
      const problem = extractProblem(content);
      const tokens = normalize(problem);
      const score = jaccard(candidateTokens, tokens);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = file.replace(/\.md$/, "");
      }
    }
  }

  if (bestScore >= JACCARD_THRESHOLD) {
    writeFileSync(
      args.out,
      JSON.stringify(
        {
          decision: "dedup-skip",
          candidate: selected,
          matched_rfc: bestMatch,
          jaccard_score: bestScore,
          reason: null,
          proposed_type: null,
          proposed_priority_tier: null,
        },
        null,
        2
      )
    );
    return;
  }

  const { type, priority_tier } = proposeTypeAndTier(selected);
  writeFileSync(
    args.out,
    JSON.stringify(
      {
        decision: "draft",
        candidate: selected,
        matched_rfc: null,
        jaccard_score: bestScore,
        reason: null,
        proposed_type: type,
        proposed_priority_tier: priority_tier,
      },
      null,
      2
    )
  );
}

main();
