/**
 * `converge apply <manifest.jsonl>` — RFC 0021.
 *
 * Declarative spawn ingest: reads a JSONL manifest of children to spawn,
 * validates each row, and renders + upserts in input order. Per-row
 * failures land in `<manifest>.result.jsonl` so the parent's repair loop
 * can patch the offending lines and re-apply.
 *
 *     converge apply <manifest.jsonl> [--dry] [--no-inherit]
 *
 * Exit code:
 *   0 — every row succeeded (including idempotent re-applies)
 *   3 — one or more rows failed (mirrors `spawn` exit-3-on-failure)
 *   2 — caller-fault error (unreadable manifest, missing CONVERGE_PLAYBOOK)
 */
import { applyManifest } from "@openplaybooks/converge-core/task/spawn";

export interface ApplyCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asBool(value: unknown): boolean {
  return value === true || value === "true" || value === "1";
}

export async function applyCommand({
  positional,
  options,
}: ApplyCommandOptions): Promise<void> {
  const manifestPath = positional[0];
  if (!manifestPath) {
    console.error(
      "usage: converge apply <manifest.jsonl> [--dry] [--no-inherit]",
    );
    process.exit(2);
  }

  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const dry = asBool(options.dry);
  const noInheritDefault = asBool(options["no-inherit"]);

  let report;
  try {
    report = await applyManifest({
      manifestPath,
      workspace,
      dry,
      noInheritDefault,
    });
  } catch (err) {
    console.error(`converge apply: ${(err as Error).message}`);
    process.exit(2);
  }

  // One-line summary, then per-row outcomes (matches `spawn` shape so
  // existing log parsers keep working).
  for (const r of report.rows) {
    if (r.ok) {
      const tag = r.idempotent ? "idempotent" : "spawned";
      console.log(`${tag}: ${r.id} → ${r.taskMdPath}`);
    } else {
      console.error(
        `converge apply: ${r.id} failed [${r.errorCode}] — ${r.error}`,
      );
    }
  }
  console.log(
    `apply complete: ${report.ok} ok, ${report.failed} failed → ${report.resultPath}`,
  );

  if (report.failed > 0) process.exit(3);
}
