import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

// Mirror cli-help.test.ts: integration tests require the CLI to be built.
// Skip the suite (rather than fail) if dist/ is missing so `pnpm test` works
// in a fresh checkout before someone has run `pnpm build`.
const describeIfBuilt = existsSync(CLI) ? describe : describe.skip;

async function scaffoldProject(playbookName: string): Promise<{
  projectDir: string;
  playbookDir: string;
  journalDir: string;
  cleanup: () => Promise<void>;
}> {
  const projectDir = await mkdtemp(join(tmpdir(), "converge-precheck-int-"));
  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);
  const taskDir = join(playbookDir, "tasks", "noop");
  const journalDir = join(projectDir, ".converge", "journal", playbookName);
  await mkdir(taskDir, { recursive: true });
  await mkdir(journalDir, { recursive: true });
  await writeFile(
    join(projectDir, ".converge", "project.yaml"),
    `name: ${playbookName}\n`,
  );
  await writeFile(join(playbookDir, "playbook.yml"), `name: ${playbookName}\n`);
  await writeFile(
    join(taskDir, "TASK.md"),
    `---\nid: noop\noutputs: []\nchecks: []\n---\n\n# noop\n\nDo nothing.\n`,
  );
  const cleanup = () => rm(projectDir, { recursive: true, force: true });
  return { projectDir, playbookDir, journalDir, cleanup };
}

async function stampRunstate(
  journalDir: string,
  playbookHash: string | undefined,
): Promise<void> {
  const metadata: Record<string, unknown> = {
    execution_id: "run-test",
    status: "complete",
    selector: "",
  };
  if (playbookHash !== undefined) metadata.playbook_hash = playbookHash;
  await writeFile(
    join(journalDir, "runstate.json"),
    JSON.stringify(
      { metadata, dag: { nodes: {}, edges: [], roots: [] } },
      null,
      2,
    ),
  );
}

describeIfBuilt("converge run — precheck (CLI integration)", () => {
  it("aborts with exit 2 in non-TTY when prior runstate exists and no flag was passed", async () => {
    const playbookName = "precheck-non-tty";
    const { projectDir, journalDir, cleanup } =
      await scaffoldProject(playbookName);
    try {
      await stampRunstate(journalDir, "stamped-hash");
      const result = spawnSync(
        "node",
        [CLI, "run", `--playbook=${playbookName}`],
        {
          cwd: projectDir,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        },
      );
      const stderr = result.stderr || "";
      const stdout = result.stdout || "";
      expect(result.status, `stdout=${stdout}\nstderr=${stderr}`).toBe(2);
      expect(stderr).toMatch(/non-interactive/);
      expect(stderr).toMatch(/--resume/);
      // runstate.json must not have been touched (no run executed)
      const stillExists = existsSync(join(journalDir, "runstate.json"));
      expect(stillExists).toBe(true);
    } finally {
      await cleanup();
    }
  });
});
