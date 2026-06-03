import { afterEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  captureReporter,
  definePlaybook,
  loadPlaybookFromFolder,
  run,
  taskDef,
} from "@openplaybooks/converge-core";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const PROJECT_DIR = resolve(__dirname, "test-three-workers");
const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge", "playbooks", "default");

function converge(args: string): {
  stdout: string;
  stderr: string;
  status: number | null;
} {
  const parts = args.split(/\s+/).filter(Boolean);
  const result = spawnSync("node", [CLI, ...parts], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

function cleanupFixture(): void {
  const journalDir = join(PROJECT_DIR, ".converge", "journal");
  const outDir = join(PROJECT_DIR, "out");
  const inventoryDir = join(PROJECT_DIR, ".converge", "inventory");
  const targetDir = join(PROJECT_DIR, ".converge", "target");
  if (existsSync(journalDir))
    rmSync(journalDir, { recursive: true, force: true });
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  if (existsSync(inventoryDir))
    rmSync(inventoryDir, { recursive: true, force: true });
  if (existsSync(targetDir))
    rmSync(targetDir, { recursive: true, force: true });
}

afterEach(() => {
  cleanupFixture();
});

describe("three-workers fixture", () => {
  it("compiles the test playbook and preserves workers=3", async () => {
    cleanupFixture();

    const compile = converge(`compile --dir=${PLAYBOOK_DIR}`);
    expect(compile.status).toBe(0);
    expect(compile.stdout + compile.stderr).toContain(
      "Compiled default: 4 nodes",
    );

    const loaded = await loadPlaybookFromFolder(PLAYBOOK_DIR);
    expect(loaded.def.run?.workers).toBe(3);
  });

  it("runs with 3 workers and leases the three ready roots in parallel", async () => {
    cleanupFixture();

    const loaded = await loadPlaybookFromFolder(PLAYBOOK_DIR);
    const reporter = captureReporter();

    const playbook = definePlaybook({
      name: loaded.def.name,
      description: loaded.def.description,
      run: loaded.def.run,
      tasks: [
        taskDef()
          .id("01-alpha")
          .title("Alpha root task")
          .outputs(["out/alpha.txt"])
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
            mkdirSync(join(PROJECT_DIR, "out"), { recursive: true });
            writeFileSync(join(PROJECT_DIR, "out", "alpha.txt"), "alpha\n");
          })
          .build(),
        taskDef()
          .id("02-beta")
          .title("Beta root task")
          .outputs(["out/beta.txt"])
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
            mkdirSync(join(PROJECT_DIR, "out"), { recursive: true });
            writeFileSync(join(PROJECT_DIR, "out", "beta.txt"), "beta\n");
          })
          .build(),
        taskDef()
          .id("03-gamma")
          .title("Gamma root task")
          .outputs(["out/gamma.txt"])
          .executor(async () => {
            await new Promise((resolve) => setTimeout(resolve, 25));
            mkdirSync(join(PROJECT_DIR, "out"), { recursive: true });
            writeFileSync(join(PROJECT_DIR, "out", "gamma.txt"), "gamma\n");
          })
          .build(),
        taskDef()
          .id("04-aggregate")
          .title("Aggregate after alpha")
          .depends_on(["01-alpha"])
          .outputs(["out/aggregate.txt"])
          .executor(async () => {
            const alpha = readFileSync(
              join(PROJECT_DIR, "out", "alpha.txt"),
              "utf-8",
            ).trim();
            mkdirSync(join(PROJECT_DIR, "out"), { recursive: true });
            writeFileSync(
              join(PROJECT_DIR, "out", "aggregate.txt"),
              `aggregate saw=${alpha}\n`,
            );
          })
          .build(),
      ],
    });

    const result = await run(playbook, {
      projectDir: PROJECT_DIR,
      workers: loaded.def.run?.workers,
      reporter,
    });

    expect(result.failed).toBe(0);
    expect(
      reporter.events.some(
        (event) => event.kind === "log" && event.message.includes("3 workers"),
      ),
    ).toBe(true);
    expect(
      reporter.events.some(
        (event) =>
          event.kind === "log" &&
          event.message.includes("[worker:local-1] leased 01-alpha"),
      ),
    ).toBe(true);
    expect(
      reporter.events.some(
        (event) =>
          event.kind === "log" &&
          event.message.includes("[worker:local-2] leased 02-beta"),
      ),
    ).toBe(true);
    expect(
      reporter.events.some(
        (event) =>
          event.kind === "log" &&
          event.message.includes("[worker:local-3] leased 03-gamma"),
      ),
    ).toBe(true);

    expect(
      readFileSync(join(PROJECT_DIR, "out", "alpha.txt"), "utf-8").trim(),
    ).toBe("alpha");
    expect(
      readFileSync(join(PROJECT_DIR, "out", "beta.txt"), "utf-8").trim(),
    ).toBe("beta");
    expect(
      readFileSync(join(PROJECT_DIR, "out", "gamma.txt"), "utf-8").trim(),
    ).toBe("gamma");
    expect(
      readFileSync(join(PROJECT_DIR, "out", "aggregate.txt"), "utf-8").trim(),
    ).toBe("aggregate saw=alpha");
  });
});
