/**
 * RFC 0024 — Spawn directory ingest (preview → apply).
 *
 * The orchestrator. Stitches the new modules together into a single
 * post-body pipeline:
 *
 *   1. Load templates       → templates.ts
 *   2. Discover invocations → discover.ts
 *   3. Expand each row      → expand.ts
 *   4. Detect strays        → strays.ts (anti-goals)
 *   5. Write EXPANDED.md    → adjacency for ok children
 *   6. Write EVIDENCE.json  → adjacency for failing children
 *   7. Write STATUS.md      → the single AI-facing surface
 *   8. Apply or hold        → preview-then-apply atomicity
 *
 * No ledger writes happen unless preview is clean. The legacy
 * `applyManifest` is reused as the actual mutator — RFC 0021's engine is
 * intentionally preserved as internal IR.
 */
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { applyManifest, type SpawnResult } from "./apply.ts";
import { discoverInvocations, type SpawnFileEvidence } from "./discover.ts";
import { expandInvocation, type ExpandedRow } from "./expand.ts";
import {
  detectStrayManifests,
  detectStrayTaskMd,
} from "./strays.ts";
import { loadTemplates } from "./templates.ts";
import { writeStatusMarkdown, type StatusOkRow } from "./status.ts";

export interface IngestOptions {
  /** Absolute path to the spawner body's cwd: `<taskDir>/spawn/`. */
  spawnRoot: string;
  /** Workspace root (project dir). */
  workspace: string;
  /** Absolute path to the playbook dir: `<workspace>/.converge/playbooks/<name>`. */
  playbookDir: string;
  /** Playbook name (the ledger and inventory live under this). */
  playbook: string;
}

export interface IngestReport {
  /** Rows that expanded cleanly during preview. */
  previewed: number;
  /** Per-file failures (discover + expand + strays). */
  rejected: number;
  /** Rows applyManifest accepted (only > 0 when preview was clean). */
  applied: number;
  /** Of the applied rows, how many were byte-identical re-applies. */
  idempotent: number;
  /** Per-child evidence (returned for callers that want machine-readable detail). */
  evidence: SpawnFileEvidence[];
}

function writeExpandedTaskMd(spawnYmlPath: string, taskMdText: string): void {
  // EXPANDED.md sits next to spawn.yml so the AI can read it (and so
  // `converge inspect` has the rendered contract for every child).
  const path = join(dirname(spawnYmlPath), "EXPANDED.md");
  writeFileSync(path, taskMdText, "utf-8");
}

function writeChildEvidence(
  spawnRoot: string,
  ev: SpawnFileEvidence,
): void {
  // Per-child EVIDENCE.json lives in the child's directory; for
  // root-level strays (the manifest case) we anchor it at the root.
  const dir =
    ev.id === "<spawn-root>" ? spawnRoot : join(spawnRoot, ev.id);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "EVIDENCE.json"),
      JSON.stringify(ev, null, 2),
      "utf-8",
    );
  } catch {
    // best-effort; STATUS.md is the source of truth.
  }
}

export async function ingestSpawnDir(
  opts: IngestOptions,
): Promise<IngestReport> {
  const { spawnRoot, workspace, playbookDir, playbook } = opts;

  if (!existsSync(spawnRoot)) {
    return { previewed: 0, rejected: 0, applied: 0, idempotent: 0, evidence: [] };
  }

  const templates = loadTemplates(playbookDir);
  const { invocations, evidence: discoveryEvidence } =
    discoverInvocations(spawnRoot);

  const evidence: SpawnFileEvidence[] = [...discoveryEvidence];
  const okRows: ExpandedRow[] = [];

  for (const inv of invocations) {
    const result = expandInvocation(inv, templates);
    if ("row" in result) {
      okRows.push(result);
      writeExpandedTaskMd(inv.spawnYmlPath, result.expandedTaskMd);
    } else {
      evidence.push(result.evidence);
    }
  }

  // Anti-goal locks. A body that wrote either kind of artefact is in
  // violation regardless of whatever else it did right.
  for (const e of detectStrayManifests(spawnRoot)) evidence.push(e);
  for (const e of detectStrayTaskMd(spawnRoot)) evidence.push(e);

  for (const ev of evidence) writeChildEvidence(spawnRoot, ev);

  const previewClean = evidence.length === 0;

  // Write STATUS.md before apply so the AI has something to read even
  // if the apply step crashes.
  const okStatusRows: StatusOkRow[] = okRows.map((r) => ({
    id: r.row.id,
    template: r.row.template,
  }));
  writeStatusMarkdown(spawnRoot, {
    phase: "preview",
    ok: previewClean,
    okRows: okStatusRows,
    evidence,
  });

  const report: IngestReport = {
    previewed: okRows.length,
    rejected: evidence.length,
    applied: 0,
    idempotent: 0,
    evidence,
  };

  if (!previewClean || okRows.length === 0) {
    return report;
  }

  // Synthesise a manifest for applyManifest. We write it under
  // `<spawnRoot>/_framework/` so it (a) doesn't trip the stray detector
  // (top-level only) and (b) doesn't show up as a child during
  // discovery (the `_` prefix is skipped).
  const frameworkDir = join(spawnRoot, "_framework");
  mkdirSync(frameworkDir, { recursive: true });
  const manifestPath = join(frameworkDir, "spawn.plan.jsonl");
  const manifestBody =
    okRows.map((r) => JSON.stringify(r.row)).join("\n") + "\n";
  writeFileSync(manifestPath, manifestBody, "utf-8");

  const applyReport = await applyManifest({
    manifestPath,
    workspace,
  });

  let applied = 0;
  let idempotent = 0;
  const applyFailures: SpawnResult[] = [];
  for (const r of applyReport.rows) {
    if (r.ok) {
      applied++;
      if (r.idempotent) idempotent++;
    } else {
      applyFailures.push(r);
    }
  }
  report.applied = applied;
  report.idempotent = idempotent;

  // Rewrite STATUS.md to reflect the apply outcome.
  writeStatusMarkdown(spawnRoot, {
    phase: "apply",
    ok: applyFailures.length === 0,
    okRows: okStatusRows,
    evidence: applyFailures.map((f) => {
      // Narrow to the failure branch — both fields exist iff ok=false.
      const failed = f as Extract<SpawnResult, { ok: false }>;
      return {
        id: failed.id,
        file: `${failed.id}/spawn.yml`,
        errorCode:
          failed.errorCode === "duplicate-id"
            ? "duplicate-id"
            : "template-not-found",
        message: failed.error,
      };
    }),
  });

  // Silence the unused-suppression for paramsDir resolution; playbook
  // is part of the contract even when applyManifest reads it from env.
  void playbook;

  return report;
}
