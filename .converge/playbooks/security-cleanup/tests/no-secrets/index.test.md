---
name: no-secrets
description: Scans git-tracked files for API keys, tokens, and credential patterns. Returns non-zero if any found.
type: js
script: ./index.cjs
---
// Reusable test: scan all git-tracked files for secret patterns.
// Used by both 01-audit and 06-verify phases.
//
// Usage from TASK.md checks:
//   - id: no-secrets-check
//     type: test
//     name: no-secrets

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Wrapped for createTestContext compatibility (converge test runner)
// Falls back to direct execution when run standalone
async function main() {
  let REPO_ROOT;
  try {
    REPO_ROOT = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
  } catch {
    console.error("Not in a git repository");
    process.exit(1);
  }

  const SECRET_PATTERNS = [
    { name: "openai-project-key", pattern: /sk-proj-[A-Za-z0-9_-]{50,}/ },
    { name: "anthropic-api-key", pattern: /sk-api-[A-Za-z0-9_-]{50,}/ },
    { name: "minimax-key", pattern: /sk-cp-[A-Za-z0-9_-]{50,}/ },
    { name: "generic-sk-key", pattern: /sk-[a-f0-9]{30,40}/ },
    { name: "gemini-key", pattern: /AIza[A-Za-z0-9_-]{30,}/ },
    { name: "meshy-key", pattern: /msy_[A-Za-z0-9_-]{20,}/ },
    { name: "grok-key", pattern: /xai-[A-Za-z0-9_-]{30,}/ },
    { name: "private-key", pattern: /BEGIN\s+(RSA|OPENSSH|EC)\s+PRIVATE\s+KEY/ },
  ];

  const EXCLUDE = [
    /node_modules/,
    /\.git\//,
    /pnpm-lock\.yaml$/,
    /package-lock\.json$/,
    /CHANGELOG\.md$/,
    /\.tsbuildinfo$/,
    /dist\//,
    /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|mp4|webm|mp3|apk|zip|sqlite)$/,
  ];

  function shouldExclude(file) {
    return EXCLUDE.some((p) => p.test(file));
  }

  const tracked = execSync("git ls-files", {
    encoding: "utf-8",
    cwd: REPO_ROOT,
  })
    .trim()
    .split("\n")
    .filter(Boolean);

  let found = 0;

  for (const file of tracked) {
    if (shouldExclude(file)) continue;

    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches) {
        // Skip test/placeholder values
        const real = matches.filter(
          (m) =>
            m !== "sk-test" &&
            m !== "sk-abc" &&
            !m.includes("YOUR_") &&
            !m.includes("placeholder") &&
            !m.includes("invalid"),
        );
        if (real.length > 0) {
          for (const m of real) {
            const lineNum =
              content.substring(0, content.indexOf(m)).split("\n").length;
            console.log(`${file}:${lineNum} [${name}] ${m.substring(0, 12)}...`);
          }
          found += real.length;
        }
      }
    }
  }

  // Check .env files
  const envFiles = tracked.filter(
    (f) => f.endsWith(".env") || f.endsWith(".env.local") || f.endsWith(".env.local-backup"),
  );
  if (envFiles.length > 0) {
    console.log(`Tracked .env files: ${envFiles.join(", ")}`);
    found += envFiles.length;
  }

  if (found > 0) {
    console.log(`\n${found} secret(s) found in tracked files.`);
    process.exit(1);
  }

  console.log("No secrets found in tracked files.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
