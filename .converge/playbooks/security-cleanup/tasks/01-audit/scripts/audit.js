/**
 * Comprehensive security audit scanner.
 *
 * Scans all git-tracked files for secrets, .env files, large artifacts,
 * hardcoded paths, missing .gitignore patterns, and pre-commit hook status.
 *
 * Output: .converge/security-cleanup/audit.json
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf-8",
}).trim();

const OUT_DIR = path.join(REPO_ROOT, ".converge", "security-cleanup");
const OUT_FILE = path.join(OUT_DIR, "audit.json");

// Secret patterns — ordered by specificity to avoid double-counting
const SECRET_PATTERNS = [
  { name: "openai-api-key", pattern: /sk-proj-[A-Za-z0-9_-]{100,}/g },
  { name: "anthropic-api-key", pattern: /sk-api-[A-Za-z0-9_-]{80,}/g },
  { name: "deepseek-key", pattern: /sk-[a-f0-9]{32}/g },
  { name: "minimax-key", pattern: /sk-cp-[A-Za-z0-9_-]{100,}/g },
  { name: "kimi-key", pattern: /sk-[A-Za-z0-9]{32,40}/g },
  { name: "gemini-key", pattern: /AIza[A-Za-z0-9_-]{33,40}/g },
  { name: "meshy-key", pattern: /msy_[A-Za-z0-9_-]{30,}/g },
  { name: "grok-key", pattern: /xai-[A-Za-z0-9_-]{40,}/g },
  { name: "kling-access-key", pattern: /AFDhg[A-Za-z0-9]{20,}/g },
  { name: "kling-secret-key", pattern: /YmF8e[A-Za-z0-9]{20,}/g },
];

// Files/directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git\//,
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /\.tsbuildinfo$/,
  /CHANGELOG\.md$/,
  /dist\//,
  /\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|mp4|webm|mp3|wav|ogg|apk|zip|tar\.gz|sqlite)$/i,
];

function log(msg) {
  console.log(`[audit] ${msg}`);
}

function getTrackedFiles() {
  const out = execSync("git ls-files", {
    encoding: "utf-8",
    cwd: REPO_ROOT,
  });
  return out.trim().split("\n").filter(Boolean);
}

function getTrackedFilesWithSize() {
  const out = execSync("git ls-files -s", {
    encoding: "utf-8",
    cwd: REPO_ROOT,
  });
  // Format: mode hash stage path
  const files = [];
  for (const line of out.trim().split("\n")) {
    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      // Git blob size isn't directly in ls-files -s.
      // We'll check file sizes on disk for tracked files.
      const fpath = parts.slice(3).join(" ");
      const fullPath = path.join(REPO_ROOT, fpath);
      try {
        const stat = fs.statSync(fullPath);
        files.push({ path: fpath, size: stat.size });
      } catch {
        // file may not exist on disk (e.g., if modified/deleted)
      }
    }
  }
  return files;
}

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some((p) => p.test(filePath));
}

function scanForSecrets(files) {
  const findings = [];

  for (const file of files) {
    if (shouldExclude(file)) continue;

    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue; // skip binary/unreadable
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      // Reset lastIndex for regex with 'g' flag
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum =
          content.substring(0, match.index).split("\n").length;
        const secret = match[0];
        const prefix = secret.substring(0, 8) + "...";

        // Skip test/placeholder values
        if (
          secret === "sk-test" ||
          secret === "sk-abc" ||
          secret.includes("YOUR_") ||
          secret.includes("test_api_key") ||
          secret.includes("your-api-key") ||
          secret.includes("invalid")
        ) {
          continue;
        }

        findings.push({
          file,
          line: lineNum,
          pattern: name,
          secret_prefix: prefix,
          provider: name.replace(/-key$/, "").replace(/-api-key$/, ""),
          context: content
            .split("\n")
            [lineNum - 1].trim()
            .substring(0, 120),
        });
      }
    }

    // Also scan for generic "secret|password|token" assignments with string values
    const genericPattern =
      /(?:SECRET|PASSWORD|API[_-]?KEY|AUTH[_-]?TOKEN)\s*[:=]\s*["']([^"']{20,})["']/gi;
    let gm;
    while ((gm = genericPattern.exec(content)) !== null) {
      const val = gm[1];
      // Skip if already caught or is a placeholder/env var reference
      if (
        val.includes("${") ||
        val === "YOUR_API_KEY_HERE" ||
        val.includes("placeholder")
      ) {
        continue;
      }
      const lineNum = content.substring(0, gm.index).split("\n").length;
      findings.push({
        file,
        line: lineNum,
        pattern: "generic-secret",
        secret_prefix: val.substring(0, 8) + "...",
        provider: "unknown",
        context: content.split("\n")[lineNum - 1].trim().substring(0, 120),
      });
    }
  }

  return findings;
}

function findTrackedEnvFiles(files) {
  return files.filter(
    (f) =>
      f.endsWith(".env") ||
      f.endsWith(".env.local") ||
      f.endsWith(".env.local-backup"),
  );
}

function findLargeFiles(fileSizes, thresholdBytes = 100_000) {
  // Exclude legitimate large source files from flagging
  const excludeFromLarge = [/pnpm-lock\.yaml$/, /\.gitignore$/, /\.zip$/, /\.apk$/];

  return fileSizes
    .filter(
      (f) =>
        f.size > thresholdBytes && !excludeFromLarge.some((p) => p.test(f.path)),
    )
    .sort((a, b) => b.size - a.size)
    .map((f) => ({
      path: f.path,
      size_bytes: f.size,
      size_human: (f.size / 1024 / 1024).toFixed(2) + " MB",
    }));
}

function findBuildArtifacts(files) {
  const artifactPatterns = [
    /^\.next\//,
    /^\.wrangler\//,
    /^\.astro\//,
    /\/\.next\//,
    /\/\.wrangler\//,
    /\/\.astro\//,
    /apps\/.*\/\.next\//,
  ];

  return files.filter((f) => artifactPatterns.some((p) => p.test(f)));
}

function findHardcodedPaths(files) {
  const findings = [];
  const userPathPattern = /\/Users\/[a-zA-Z0-9_-]+/g;

  for (const file of files) {
    if (shouldExclude(file)) continue;
    // Only check config/doc files, not all source
    if (!/\.(json|yml|yaml|md|local)$/.test(file)) continue;

    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    let match;
    while ((match = userPathPattern.exec(content)) !== null) {
      const lineNum =
        content.substring(0, match.index).split("\n").length;
      findings.push({
        file,
        line: lineNum,
        path: match[0],
      });
    }
  }

  return findings;
}

function checkGitignoreCoverage() {
  const gitignorePath = path.join(REPO_ROOT, ".gitignore");
  let content = "";
  try {
    content = fs.readFileSync(gitignorePath, "utf-8");
  } catch {
    return { exists: false, missingPatterns: [] };
  }

  const desired = [
    { pattern: "*.local-backup", description: "Local backup env files" },
    { pattern: "*.local", description: "Local config files" },
    { pattern: ".wrangler/", description: "Cloudflare Wrangler state" },
    { pattern: ".next/", description: "Next.js build output" },
    { pattern: ".astro/", description: "Astro build cache" },
    {
      pattern: "**/target/docs/",
      description: "Generated playbook documentation",
    },
    { pattern: "assets/brand/explorations/", description: "Brand design explorations" },
  ];

  const missing = desired.filter((d) => !content.includes(d.pattern));
  return { exists: true, missingPatterns: missing };
}

function findInternalEndpoints(files) {
  const endpoints = [];
  const urlPattern =
    /https?:\/\/api\.(deepseek|minimax|moonshot|kimi)\.(com|cn|io)[^\s"')\]}]*/gi;

  for (const file of files) {
    if (shouldExclude(file)) continue;
    if (!/\.(yml|yaml|json|ts|md)$/.test(file)) continue;

    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    let match;
    while ((match = urlPattern.exec(content)) !== null) {
      endpoints.push({ file, url: match[0] });
    }
  }

  return endpoints;
}

function checkPrecommitHook() {
  const hookPath = path.join(REPO_ROOT, ".git", "hooks", "pre-commit");
  const exists = fs.existsSync(hookPath);
  let hasSecretDetection = false;

  if (exists) {
    try {
      const content = fs.readFileSync(hookPath, "utf-8");
      hasSecretDetection =
        /secret|SECRET|sk-|api[_-]?key/i.test(content);
    } catch {}
  }

  return { exists, hasSecretDetection };
}

// Main
log("Starting comprehensive security audit...");
log("");

const trackedFiles = getTrackedFiles();
const fileSizes = getTrackedFilesWithSize();
log(`Scanned ${trackedFiles.length} tracked files`);

const secrets = scanForSecrets(trackedFiles);
log(`Found ${secrets.length} potential secrets`);

const trackedEnvFiles = findTrackedEnvFiles(trackedFiles);
log(`Found ${trackedEnvFiles.length} tracked .env files`);

const largeFiles = findLargeFiles(fileSizes);
log(`Found ${largeFiles.length} large files (>100KB)`);

const buildArtifacts = findBuildArtifacts(trackedFiles);
log(`Found ${buildArtifacts.length} build artifact files`);

const hardcodedPaths = findHardcodedPaths(trackedFiles);
log(`Found ${hardcodedPaths.length} hardcoded local paths`);

const gitignoreCoverage = checkGitignoreCoverage();
log(
  `Gitignore: ${gitignoreCoverage.missingPatterns.length} missing patterns`,
);

const endpoints = findInternalEndpoints(trackedFiles);
log(`Found ${endpoints.length} internal API endpoint references`);

const precommit = checkPrecommitHook();
log(`Pre-commit hook: ${precommit.exists ? "exists" : "missing"}`);

// Write report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalSecrets: secrets.length,
    totalTrackedEnvFiles: trackedEnvFiles.length,
    totalLargeFiles: largeFiles.length,
    totalBuildArtifacts: buildArtifacts.length,
    totalHardcodedPaths: hardcodedPaths.length,
    totalInternalEndpoints: endpoints.length,
    gitignoreMissingPatterns: gitignoreCoverage.missingPatterns.length,
    precommitHookInstalled: precommit.exists,
    precommitHasSecretDetection: precommit.hasSecretDetection,
    isClean:
      secrets.length === 0 &&
      trackedEnvFiles.length === 0 &&
      largeFiles.length === 0 &&
      buildArtifacts.length === 0 &&
      hardcodedPaths.length === 0 &&
      gitignoreCoverage.missingPatterns.length === 0 &&
      precommit.exists &&
      precommit.hasSecretDetection,
  },
  secrets,
  trackedEnvFiles: trackedEnvFiles.map((f) => ({ path: f })),
  largeFiles,
  buildArtifacts: buildArtifacts.map((f) => ({ path: f })),
  hardcodedPaths,
  gitignore: {
    exists: gitignoreCoverage.exists,
    missingPatterns: gitignoreCoverage.missingPatterns,
  },
  internalEndpoints: endpoints,
  precommitHook: precommit,
};

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
log("");
log(`Audit report written to ${OUT_FILE}`);
log(
  `Overall: ${report.summary.isClean ? "CLEAN" : "ISSUES FOUND — review the report"}`,
);

// Exit non-zero if issues found (for CI/gate purposes)
if (!report.summary.isClean) {
  log("");
  log("Summary of issues:");
  if (secrets.length > 0) {
    log(`  - ${secrets.length} secrets found in source files`);
    for (const s of secrets) {
      log(`    ${s.file}:${s.line} [${s.pattern}] ${s.secret_prefix}`);
    }
  }
  if (trackedEnvFiles.length > 0) {
    log(`  - ${trackedEnvFiles.length} tracked .env files`);
    for (const f of trackedEnvFiles) {
      log(`    ${f}`);
    }
  }
  if (largeFiles.length > 0) {
    log(`  - ${largeFiles.length} large files`);
    for (const f of largeFiles.slice(0, 10)) {
      log(`    ${f.path} (${f.size_human})`);
    }
  }
  process.exit(1);
}
