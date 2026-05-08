/**
 * Companion script for the no-secrets reusable test.
 *
 * Provides a createTestContext-compatible runner so the test can be
 * invoked via `converge test` with typed args.
 *
 * Usage (standalone): node index.js
 * Usage (converge test): referenced by index.test.md as type: js
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

/**
 * createTestContext — minimal polyfill for standalone execution.
 * When run via `converge test`, the framework provides a richer context.
 */
function createTestContext(taskId) {
  return {
    taskId,
    readFile: (relativePath) => {
      const repoRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf-8",
      }).trim();
      return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
    },
    glob: (pattern) => {
      const repoRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf-8",
      }).trim();
      return execSync(`git ls-files | grep '${pattern.replace(/\*/g, ".*")}'`, {
        encoding: "utf-8",
        cwd: repoRoot,
      })
        .trim()
        .split("\n")
        .filter(Boolean);
    },
    run: (cmd) => {
      const repoRoot = execSync("git rev-parse --show-toplevel", {
        encoding: "utf-8",
      }).trim();
      return execSync(cmd, { encoding: "utf-8", cwd: repoRoot });
    },
  };
}

// If running as main
if (require.main === module) {
  const ctx = createTestContext("no-secrets");

  const SECRET_PATTERNS = [
    { name: "openai-project-key", pattern: /sk-proj-[A-Za-z0-9_-]{50,}/ },
    { name: "anthropic-api-key", pattern: /sk-api-[A-Za-z0-9_-]{50,}/ },
    { name: "minimax-key", pattern: /sk-cp-[A-Za-z0-9_-]{50,}/ },
    { name: "generic-sk-key", pattern: /sk-[a-f0-9]{30,40}/ },
    { name: "gemini-key", pattern: /AIza[A-Za-z0-9_-]{30,}/ },
    { name: "meshy-key", pattern: /msy_[A-Za-z0-9_-]{20,}/ },
    { name: "grok-key", pattern: /xai-[A-Za-z0-9_-]{30,}/ },
  ];

  const tracked = ctx
    .run("git ls-files")
    .trim()
    .split("\n")
    .filter(Boolean);

  let found = 0;

  for (const file of tracked) {
    if (
      file.includes("node_modules") ||
      file.endsWith("pnpm-lock.yaml") ||
      file.endsWith("package-lock.json")
    )
      continue;

    let content;
    try {
      content = ctx.readFile(file);
    } catch {
      continue;
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      const matches = content.match(pattern) || [];
      for (const m of matches) {
        if (
          m === "sk-test" ||
          m === "sk-abc" ||
          m.includes("YOUR_") ||
          m.includes("placeholder")
        )
          continue;
        console.log(`${file} [${name}] ${m.substring(0, 12)}...`);
        found++;
      }
    }
  }

  if (found > 0) {
    console.log(`\nFAIL: ${found} secret(s) found.`);
    process.exit(1);
  }

  console.log("PASS: No secrets found.");
  process.exit(0);
}
