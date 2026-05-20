#!/usr/bin/env node
// Weighted round-robin candidate selection with staleness boost.
// Reads candidates.jsonl + source-cursor.jsonl, picks one, updates cursor.
//
// Usage:
//   source-cursor.mjs --candidates <path> --cursor <path> --epoch <NNN> --out <path>

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BASE_WEIGHTS = { issue: 3, idea: 2, backlog: 2, "code-finding": 1 };
const STALENESS_DIVISOR = 3;

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    out[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return out;
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8").replace(/^﻿/, "");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function writeJsonl(path, rows) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

function epochInt(s) {
  return parseInt(String(s).replace(/^0+/, "") || "0", 10);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = readJsonl(args.candidates);
  const cursor = readJsonl(args.cursor);
  const currentEpoch = epochInt(args.epoch);

  mkdirSync(dirname(args.out), { recursive: true });

  if (candidates.length === 0) {
    writeFileSync(
      args.out,
      JSON.stringify(
        { source: "none", ref: null, reason: "no-candidates" },
        null,
        2
      )
    );
    process.exit(0);
  }

  // Group by source
  const bySource = new Map();
  for (const c of candidates) {
    if (!bySource.has(c.source)) bySource.set(c.source, []);
    bySource.get(c.source).push(c);
  }

  // Cursor lookup
  const cursorBySource = new Map(cursor.map((r) => [r.source, r]));

  // Compute effective weight per source
  let winner = null;
  let winnerWeight = -1;
  let winnerLastPicked = Infinity;
  for (const [source, rows] of bySource.entries()) {
    if (rows.length === 0) continue;
    const base = BASE_WEIGHTS[source] ?? 1;
    const lastPicked = cursorBySource.get(source)?.last_picked_epoch ?? 0;
    const stalenessMultiplier = Math.max(
      1,
      (currentEpoch - lastPicked) / STALENESS_DIVISOR
    );
    const effective = base * stalenessMultiplier;
    if (
      effective > winnerWeight ||
      (effective === winnerWeight && lastPicked < winnerLastPicked)
    ) {
      winner = source;
      winnerWeight = effective;
      winnerLastPicked = lastPicked;
    }
  }

  if (!winner) {
    writeFileSync(
      args.out,
      JSON.stringify(
        { source: "none", ref: null, reason: "no-eligible-source" },
        null,
        2
      )
    );
    process.exit(0);
  }

  const picked = bySource.get(winner)[0];

  // Update cursor
  const nextCursor = [];
  const allSources = new Set([
    ...cursorBySource.keys(),
    ...bySource.keys(),
    ...Object.keys(BASE_WEIGHTS),
  ]);
  for (const source of allSources) {
    const existing = cursorBySource.get(source) ?? {
      source,
      last_picked_epoch: 0,
      pick_count: 0,
    };
    if (source === winner) {
      nextCursor.push({
        source,
        last_picked_epoch: currentEpoch,
        pick_count: (existing.pick_count ?? 0) + 1,
      });
    } else {
      nextCursor.push(existing);
    }
  }
  writeJsonl(args.cursor, nextCursor);

  // Write selected
  writeFileSync(
    args.out,
    JSON.stringify(
      {
        ...picked,
        _selection: {
          effective_weight: winnerWeight,
          base_weight: BASE_WEIGHTS[winner] ?? 1,
          last_picked_epoch: winnerLastPicked,
          epoch: currentEpoch,
        },
      },
      null,
      2
    )
  );
}

main();
