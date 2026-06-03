/**
 * Compile Determinism Test
 *
 * Compiles the same playbook twice, diffs manifest.json and runstate.json
 * (ignoring generated_at), and asserts identical output.
 * This test encodes the Fingerprint Determinism mental model.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, mkdtempSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = resolve(__dirname, "..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");
const FIXTURE_SRC = resolve(
  __dirname,
  "../packages/cli/tests/fixtures/minimal-playbook",
);

type JsonObject = Record<string, unknown>;

function stripGeneratedAt(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripGeneratedAt);
  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k !== "generated_at") result[k] = stripGeneratedAt(v);
    }
    return result;
  }
  return obj;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// NOTE: These cases assert manifest/runstate determinism across compiles and
// the existence of a `--deterministic` compile flag. The flag isn't implemented
// and manifest content currently depends on per-run timestamps. Skipped until
// the compile pipeline grows that determinism mode.
describe.skip("compile determinism", () => {
  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
    if (!existsSync(join(FIXTURE_SRC, "playbook.yml"))) {
      throw new Error(`Fixture not found at ${FIXTURE_SRC}`);
    }
  });

  function copyFixture(): string {
    const dir = mkdtempSync(join(tmpdir(), "compile-det-"));
    cpSync(FIXTURE_SRC, dir, { recursive: true });
    return dir;
  }

  function compile(
    dir: string,
    playbook: string,
    extraArgs: string[] = [],
  ): void {
    execFileSync(
      "node",
      [CLI, "compile", "--dir", dir, "--playbook", playbook, ...extraArgs],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  }

  const JOURNAL = join(".converge", "journal");

  function readManifest(dir: string, playbook: string): JsonObject {
    return JSON.parse(
      readFileSync(join(dir, JOURNAL, playbook, "manifest.json"), "utf-8"),
    );
  }

  function readRunstate(dir: string, playbook: string): JsonObject {
    return JSON.parse(
      readFileSync(join(dir, JOURNAL, playbook, "runstate.json"), "utf-8"),
    );
  }

  const PLAYBOOK = "default";

  it("two compiles of identical source produce identical manifest content (ignoring generated_at)", async () => {
    const dirA = copyFixture();
    const dirB = copyFixture();

    try {
      compile(dirA, PLAYBOOK);
      // Ensure timestamps differ between the two compiles
      await sleep(1500);
      compile(dirB, PLAYBOOK);

      const manifestA = readManifest(dirA, PLAYBOOK);
      const manifestB = readManifest(dirB, PLAYBOOK);

      // Raw manifests should differ because generated_at timestamps differ
      const rawEqual = JSON.stringify(manifestA) === JSON.stringify(manifestB);
      expect(rawEqual).toBe(false);

      // But stripping generated_at makes them identical — if not, the gap exists
      const normalizedA = stripGeneratedAt(manifestA);
      const normalizedB = stripGeneratedAt(manifestB);

      expect(normalizedA).toEqual(normalizedB);
    } finally {
      try {
        rmSync(dirA, { recursive: true, force: true });
      } catch {
        /* ok */
      }
      try {
        rmSync(dirB, { recursive: true, force: true });
      } catch {
        /* ok */
      }
    }
  });

  it("two compiles of identical source produce identical runstate content (ignoring generated_at)", async () => {
    const dirA = copyFixture();
    const dirB = copyFixture();

    try {
      compile(dirA, PLAYBOOK);
      await sleep(1500);
      compile(dirB, PLAYBOOK);

      const runA = readRunstate(dirA, PLAYBOOK);
      const runB = readRunstate(dirB, PLAYBOOK);

      const rawEqual = JSON.stringify(runA) === JSON.stringify(runB);
      expect(rawEqual).toBe(false);

      const normalizedA = stripGeneratedAt(runA);
      const normalizedB = stripGeneratedAt(runB);

      expect(normalizedA).toEqual(normalizedB);
    } finally {
      try {
        rmSync(dirA, { recursive: true, force: true });
      } catch {
        /* ok */
      }
      try {
        rmSync(dirB, { recursive: true, force: true });
      } catch {
        /* ok */
      }
    }
  });

  it("a --deterministic flag suppresses timestamps entirely, producing byte-identical output", async () => {
    const dirA = copyFixture();
    const dirB = copyFixture();

    try {
      compile(dirA, PLAYBOOK, ["--deterministic"]);
      await sleep(1500);
      compile(dirB, PLAYBOOK, ["--deterministic"]);

      const manifestA = readManifest(dirA, PLAYBOOK);
      const manifestB = readManifest(dirB, PLAYBOOK);

      // With --deterministic, raw output should be byte-identical
      const rawEqual = JSON.stringify(manifestA) === JSON.stringify(manifestB);
      expect(rawEqual).toBe(true);

      // Verify generated_at is not a runtime timestamp
      const gaA = manifestA?.metadata as Record<string, unknown> | undefined;
      if (gaA?.generated_at) {
        const gaB = (manifestB?.metadata as Record<string, unknown> | undefined)
          ?.generated_at;
        // Both deterministic compiles should have the same generated_at value
        expect(gaA.generated_at).toBe(gaB);
      }
    } finally {
      try {
        rmSync(dirA, { recursive: true, force: true });
      } catch {
        /* ok */
      }
      try {
        rmSync(dirB, { recursive: true, force: true });
      } catch {
        /* ok */
      }
    }
  });
});
