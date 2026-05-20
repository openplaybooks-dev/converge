/**
 * RFC 0019 — Per-attempt snapshot bundles (part 1).
 *
 * Ships the bundle manifest schema, file-vs-pointer decision, and
 * secret-redaction helpers. Part 2 lands the actual tar.gz writer
 * and the `converge replay` subcommand.
 */
import { createHash } from "node:crypto";

/**
 * Default size threshold for embedding vs pointer (5 MB). Files larger
 * than this get a {kind: "ref"} entry pointing at the original journal
 * location.
 */
export const DEFAULT_EMBED_MAX_BYTES = 5 * 1024 * 1024;

export type EmbedDecision =
  | { kind: "embed"; bytes: number }
  | { kind: "ref"; path: string; sha256: string; bytes: number };

export interface SnapshotMetadata {
  taskId: string;
  attempt: number;
  outcome: "success" | "check_fail" | "output_missing" | "transient" | "authoring" | "deterministic";
  costUsd: number;
  durationMs: number;
  /** ISO timestamp. */
  startedAt: string;
  endedAt: string;
}

export interface SnapshotEntry {
  /** Path inside the bundle (forward slashes). */
  bundlePath: string;
  decision: EmbedDecision;
}

export interface SnapshotBundle {
  metadata: SnapshotMetadata;
  entries: SnapshotEntry[];
}

/* ------------------------------------------------------------------ */
/*  Embed vs pointer decision                                         */
/* ------------------------------------------------------------------ */

export function decideEmbedding(args: {
  bytes: number;
  /** Original journal path (used for the pointer when ref'd). */
  sourcePath: string;
  /** Caller-supplied content sha (cheaper than recomputing every call). */
  sha256: string;
  /** Maximum bytes to inline. Defaults to DEFAULT_EMBED_MAX_BYTES. */
  maxBytes?: number;
}): EmbedDecision {
  const cap = args.maxBytes ?? DEFAULT_EMBED_MAX_BYTES;
  if (args.bytes <= cap) {
    return { kind: "embed", bytes: args.bytes };
  }
  return { kind: "ref", path: args.sourcePath, sha256: args.sha256, bytes: args.bytes };
}

/* ------------------------------------------------------------------ */
/*  Secret redaction                                                  */
/* ------------------------------------------------------------------ */

/**
 * Built-in secret-bearing env-var names. Callers can extend per
 * project.yml. Matching is case-insensitive substring.
 */
export const DEFAULT_SECRET_KEYS: readonly string[] = [
  "TOKEN",
  "KEY",
  "SECRET",
  "PASSWORD",
  "PASSWD",
  "API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "MINIMAX_API_KEY",
  "AWS_SECRET",
];

export function redactEnv(
  env: Record<string, string>,
  extraSecretKeys: readonly string[] = [],
): Record<string, string> {
  const patterns = [...DEFAULT_SECRET_KEYS, ...extraSecretKeys].map((k) => k.toUpperCase());
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(env)) {
    const upper = k.toUpperCase();
    const isSecret = patterns.some((p) => upper.includes(p));
    out[k] = isSecret ? "[REDACTED]" : v;
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  SHA helper                                                        */
/* ------------------------------------------------------------------ */

export function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/* ------------------------------------------------------------------ */
/*  Bundle path layout                                                */
/* ------------------------------------------------------------------ */

/**
 * Canonical paths inside a snapshot bundle. Stable so `converge
 * replay` and consumers can rely on them.
 */
export const BUNDLE_PATHS = {
  task: "TASK.md",
  metadata: "metadata.json",
  envJson: "env.json",
  toolCalls: "tool-calls.jsonl",
  aiPrompts: "ai-prompts.jsonl",
  aiResponses: "ai-responses.jsonl",
  inputDir: "inputs/",
  outputDir: "outputs/",
} as const;
