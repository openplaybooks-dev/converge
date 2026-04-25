/**
 * Reset — wipe journal state at a given scope.
 *
 * Journal is the source of truth, so reset is just a targeted `rm -rf` under
 * `.converge/journal/`. No checkpoint surgery, no output scraping.
 *
 *   converge reset --all                     whole .converge/journal/
 *   converge reset <playbook>                .converge/journal/<pb>/
 *   converge reset <playbook> <taskPath>     .converge/journal/<pb>/tasks/<taskPath>/
 *
 * `taskPath` is the slash-separated journal id (e.g. `parent/spawn-a` or
 * `parent/spawn-a/grandchild`). Descendant `spawned/` subtrees are inside the
 * target dir and go with it.
 */

import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join, resolve, relative, isAbsolute } from "node:path";
import type { CommonOptions } from "./commands.ts";

export interface ResetOptions extends CommonOptions {
  /** Wipe the entire journal root (no playbook/task args). */
  all?: boolean;
  /** Skip the confirmation prompt (used for non-interactive runs). */
  yes?: boolean;
}

function usage(): never {
  console.error(
    [
      "",
      "Usage:",
      "  converge reset --all                     Delete entire .converge/journal/",
      "  converge reset <playbook>                Delete .converge/journal/<playbook>/",
      "  converge reset <playbook> <taskPath>     Delete one task subtree (incl. spawned descendants)",
      "",
      "Examples:",
      "  converge reset --all",
      "  converge reset deep-research",
      '  converge reset deep-research parent/spawn-a',
      "",
    ].join("\n"),
  );
  process.exit(1);
}

/**
 * Guard: target must be inside `{projectDir}/.converge/journal/`. Refuses
 * anything else so a bad arg can't `rm -rf` an unrelated directory.
 */
function assertUnderJournal(projectDir: string, target: string): void {
  const journalRoot = resolve(projectDir, ".converge", "journal");
  const resolved = resolve(target);
  const rel = relative(journalRoot, resolved);
  const escapes =
    rel === "" // allowed — whole-journal reset
      ? false
      : rel.startsWith("..") || isAbsolute(rel);
  if (escapes) {
    throw new Error(
      `Refusing to delete outside journal root.\n  journal: ${journalRoot}\n  target:  ${resolved}`,
    );
  }
}

/**
 * Basic sanity for user-supplied path segments. Disallow "..", absolute paths,
 * and the structural markers that belong to the layout (`tasks`, `spawned`).
 * Returns the validated segments.
 */
function parseTaskPath(taskPath: string): string[] {
  if (!taskPath) throw new Error("taskPath is required");
  const norm = taskPath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (norm === "") throw new Error("taskPath is empty");
  const segments = norm.split("/");
  for (const seg of segments) {
    if (seg === "" || seg === "." || seg === "..") {
      throw new Error(`Invalid taskPath segment: "${seg}"`);
    }
    if (seg === "tasks" || seg === "spawned") {
      throw new Error(
        `Structural marker "${seg}" must not appear in taskPath — use the journal id (e.g. parent/child), not the filesystem layout.`,
      );
    }
  }
  return segments;
}

/**
 * Translate a slash-separated journal id into the actual filesystem subpath
 * under `{playbook}/tasks/`. The first segment is the top-level task; every
 * subsequent segment is a spawned descendant.
 *
 *   "parent"                   → tasks/parent
 *   "parent/child"             → tasks/parent/spawned/child
 *   "parent/child/grand"       → tasks/parent/spawned/child/spawned/grand
 */
function journalIdToFsSegments(segments: string[]): string[] {
  const out: string[] = ["tasks", segments[0]];
  for (let i = 1; i < segments.length; i++) {
    out.push("spawned", segments[i]);
  }
  return out;
}

export async function resetCommand(
  positional: string[],
  options: ResetOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const journalRoot = join(projectDir, ".converge", "journal");

  // --all, no args: whole journal root
  if (options.all && positional.length === 0) {
    assertUnderJournal(projectDir, journalRoot);
    if (!existsSync(journalRoot)) {
      console.log("ℹ️  No journal directory — nothing to reset.");
      return;
    }
    console.log(`\n🗑️  Deleting entire journal: ${relative(projectDir, journalRoot)}/`);
    await rm(journalRoot, { recursive: true, force: true });
    console.log("✅ Journal reset complete.");
    return;
  }

  if (positional.length === 0) {
    usage();
  }

  const [playbook, taskPath] = positional;

  if (!playbook || /[/\\]/.test(playbook)) {
    console.error(`❌ Invalid playbook name: "${playbook}"`);
    usage();
  }

  // Playbook-level reset
  if (positional.length === 1) {
    const pbDir = join(journalRoot, playbook);
    assertUnderJournal(projectDir, pbDir);
    if (!existsSync(pbDir)) {
      console.log(`ℹ️  No journal for playbook "${playbook}" — nothing to reset.`);
      return;
    }
    console.log(`\n🗑️  Deleting ${relative(projectDir, pbDir)}/`);
    await rm(pbDir, { recursive: true, force: true });
    console.log(`✅ Reset playbook "${playbook}".`);
    return;
  }

  // Task-level reset
  if (positional.length === 2) {
    let journalIdSegments: string[];
    try {
      journalIdSegments = parseTaskPath(taskPath);
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      usage();
    }
    const fsSegments = journalIdToFsSegments(journalIdSegments);
    const taskDir = join(journalRoot, playbook, ...fsSegments);
    assertUnderJournal(projectDir, taskDir);
    if (!existsSync(taskDir)) {
      console.log(
        `ℹ️  No journal at ${relative(projectDir, taskDir)} — nothing to reset.`,
      );
      return;
    }
    console.log(`\n🗑️  Deleting ${relative(projectDir, taskDir)}/`);
    await rm(taskDir, { recursive: true, force: true });
    console.log(
      `✅ Reset task "${journalIdSegments.join("/")}" under playbook "${playbook}".`,
    );
    return;
  }

  console.error("❌ Too many arguments.");
  usage();
}
