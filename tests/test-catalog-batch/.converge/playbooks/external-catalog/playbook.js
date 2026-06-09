/**
 * external-catalog — 100-item batch spawn expressed as a code-first flow.
 *
 * The original `playbook.yml` delegated the fan-out to an external shell
 * script (`scripts/spawn-batch.sh`) that built a JSONL and called
 * `converge spawn --batch`. As an RFC 0050 code-first flow the same fan-out
 * is expressed imperatively: read `catalog.json`, then run the
 * `catalog-item` template task once per item under a `parallel` (bounded by
 * the 10-worker budget declared in `meta.run.workers`).
 *
 * On resume each child is a journaled step keyed by `seed/<item.id>` — already
 * completed items replay from the journal without re-running.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const meta = {
  name: "external-catalog",
  description: "100-item batch spawn from catalog.json via external shell script.",
  run: { maxTaskAttempts: 3, maxDuration: "5m", workers: 10 },
  phases: [{ title: "Seed" }],
};

export default async function flow({ phase, log, task, parallel }) {
  phase("Seed");

  // Read the catalog that the legacy shell script used to slurp with grep.
  const here = dirname(fileURLToPath(import.meta.url));
  const catalog = JSON.parse(
    readFileSync(join(here, "catalog.json"), "utf-8"),
  );
  log(`catalog: ${catalog.length} items`);

  // Imperative fan-out — one `catalog-item` template invocation per row,
  // bounded by `run.workers`. Mirrors what `scripts/spawn-batch.sh` did via
  // `converge spawn --batch`, but as journaled flow steps.
  await parallel(
    catalog.map((item) => () =>
      task(
        "templates/catalog-item/TASK.md",
        {
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
        },
        { key: `seed/${item.id}` },
      ),
    ),
  );

  // Write the summary file the static `seed-all` task used to produce, so any
  // downstream check that looks for `output/batch-external/summary.txt` keeps
  // working without the shell script.
  const { mkdirSync, writeFileSync } = await import("node:fs");
  mkdirSync(join(here, "output", "batch-external"), { recursive: true });
  writeFileSync(
    join(here, "output", "batch-external", "summary.txt"),
    `batch-spawned: ${catalog.length} items\n`,
  );

  return { done: true, count: catalog.length };
}
