/**
 * Migrate the test fixtures to code-first flows (RFC 0050) — as a flow itself.
 *
 * This visible flow discovers every `tests/<name>` fixture that ships a folder
 * playbook (`.converge/playbooks/<pb>/playbook.yml`) and fans out one
 * `convert-fixture` task per fixture (bounded by `workers`), each of which uses
 * the model to write a `playbook.js` flow next to the YAML and wire MiniMax
 * into the fixture's `project.yaml`. Resumable: re-running with `--resume`
 * skips fixtures already converted.
 *
 *   converge run migrate-tests-to-flow            # needs MINIMAX_API_KEY
 *   converge run migrate-tests-to-flow --resume
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const meta = {
  name: "migrate-tests-to-flow",
  description: "Convert tests/* folder playbooks to playbook.js flows + MiniMax.",
  run: { workers: 3 },
  phases: [{ title: "Discover" }, { title: "Convert" }],
};

export default async function flow({ phase, log, task, parallel, args }) {
  phase("Discover");
  const only = args && args.only ? String(args.only) : null;
  const testsDir = join(process.cwd(), "tests");
  const fixtures = [];
  for (const entry of readdirSync(testsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("test-")) continue;
    if (only && !entry.name.includes(only)) continue;
    const pbRoot = join(testsDir, entry.name, ".converge", "playbooks");
    if (!existsSync(pbRoot)) continue;
    for (const pb of readdirSync(pbRoot)) {
      if (existsSync(join(pbRoot, pb, "playbook.yml"))) {
        fixtures.push({
          fixtureDir: `tests/${entry.name}`,
          playbookName: pb,
        });
      }
    }
  }
  log(`found ${fixtures.length} folder playbook(s) to migrate${only ? ` (filter: ${only})` : ""}`);

  phase("Convert");
  // One conversion task per fixture (tasks/convert-fixture/TASK.md invoked with
  // params + a unique key IS the fan-out — no templates/ needed). Tolerate
  // per-fixture failure so a single hard fixture doesn't abort the batch.
  const results = await parallel(
    fixtures.map((f) => () =>
      task("tasks/convert-fixture/TASK.md", f, {
        key: `${f.fixtureDir}#${f.playbookName}`,
      }).then(
        (out) => ({ ...f, ok: true, out }),
        (err) => ({ ...f, ok: false, error: String(err && err.message || err) }),
      ),
    ),
  );

  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  log(`converted ${ok.length}/${fixtures.length}; ${failed.length} need manual finishing`);
  return { migrated: ok.length, failed: failed.map((f) => f.fixtureDir) };
}
