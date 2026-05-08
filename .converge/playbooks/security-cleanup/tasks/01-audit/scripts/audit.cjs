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
const { execSync, spawnSync } = require("child_process");

// 50MB buffer for git commands in large repos
const MAX_BUFFER = 50 * 1024 * 1024;

function exec(cmd, opts) {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: MAX_BUFFER, ...opts });
}

const REPO_ROOT = exec("git rev-parse --show-toplevel").trim();

const OUT_DIR = path.join(REPO_ROOT, ".converge", "security-cleanup");
const OUT_FILE = path.join(OUT_DIR, "audit.json");

// Secret patterns
const SECRET_PATTERNS = [
  { name: "openai-api-key", pattern: /sk-proj-[A-Za-z0-9_-]{60,}/g },
  { name: "anthropic-api-key", pattern: /sk-api-[A-Za-z0-9_-]{60,}/g },
  { name: "minimax-key", pattern: /sk-cp-[A-Za-z0-9_-]{60,}/g },
  { name: "deepseek-key", pattern: /sk-[a-f0-9]{30,36}/g },
  { name: "kimi-key", pattern: /sk-[A-Za-z0-9]{30,40}/g },
  { name: "gemini-key", pattern: /AIza[A-Za-z0-9_-]{30,}/g },
  { name: "meshy-key", pattern: /msy_[A-Za-z0-9_-]{25,}/g },
  { name: "grok-key", pattern: /xai-[A-Za-z0-9_-]{30,}/g },
  { name: "kling-access-key", pattern: /AFDhg[A-Za-z0-9]{15,}/g },
  { name: "kling-secret-key", pattern: /YmF8e[A-Za-z0-9]{15,}/g },
];

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
  const out = exec("git ls-files", { cwd: REPO_ROOT });
  return out.trim().split("\n").filter(Boolean);
}

function getTrackedFilesWithSize() {
  const out = exec("git ls-files", { cwd: REPO_ROOT });
  const files = [];
  for (const fpath of out.trim().split("\n")) {
    if (!fpath) continue;
    const fullPath = path.join(REPO_ROOT, fpath);
    try {
      const stat = fs.statSync(fullPath);
      files.push({ path: fpath, size: stat.size });
    } catch {
      // file may not exist on disk
    }
  }
  return files;
}

function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some((p) => p.test(filePath));
}

function scanForSecrets(files) {
  const findings = [];

  // Only scan text-like files for performance
  const textExts = /\.(ts|tsx|js|jsx|mjs|cjs|json|yml|yaml|md|txt|html|css|scss|sh|env|example|local|gitignore|dockerignore|yml|yaml)$/i;

  for (const file of files) {
    if (shouldExclude(file)) continue;
    if (!textExts.test(file)) continue;

    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    for (const { name, pattern } of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        const secret = match[0];
        const prefix = secret.substring(0, 12) + "...";

        if (
          secret === "sk-test" || secret === "sk-abc" ||
          secret.includes("YOUR_") || secret.includes("your-api-key") ||
          secret.includes("invalid")
        ) continue;

        findings.push({
          file,
          line: lineNum,
          pattern: name,
          secret_prefix: prefix,
          provider: name.replace(/-key$/, "").replace(/-api-key$/, ""),
          context: content.split("\n")[lineNum - 1].trim().substring(0, 120),
        });
      }
    }
  }

  return findings;
}

function findTrackedEnvFiles(files) {
  return files.filter((f) =>
    f.endsWith(".env") || f.endsWith(".env.local") || f.endsWith(".env.local-backup")
  );
}

function findLargeFiles(fileSizes, thresholdBytes) {
  thresholdBytes = thresholdBytes || 100000;
  const excludeFromLarge = [/pnpm-lock\.yaml$/, /\.gitignore$/, /\.zip$/, /\.apk$/];
  return fileSizes
    .filter((f) => f.size > thresholdBytes && !excludeFromLarge.some((p) => p.test(f.path)))
    .sort((a, b) => b.size - a.size)
    .map((f) => ({
      path: f.path,
      size_bytes: f.size,
      size_human: (f.size / 1024 / 1024).toFixed(2) + " MB",
    }));
}

function findBuildArtifacts(files) {
  const patterns = [/^\.next\//, /^\.wrangler\//, /^\.astro\//, /\/\.next\//, /\/\.wrangler\//, /\/\.astro\//];
  return files.filter((f) => patterns.some((p) => p.test(f)));
}

function findHardcodedPaths(files) {
  const findings = [];
  const pattern = /\/Users\/[a-zA-Z0-9_-]+/g;
  for (const file of files) {
    if (shouldExclude(file)) continue;
    if (!/\.(json|yml|yaml|md|local)$/.test(file)) continue;
    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try { content = fs.readFileSync(fullPath, "utf-8"); } catch { continue; }
    let match;
    while ((match = pattern.exec(content)) !== null) {
      findings.push({ file, line: content.substring(0, match.index).split("\n").length, path: match[0] });
    }
  }
  return findings;
}

function checkGitignoreCoverage() {
  const gitignorePath = path.join(REPO_ROOT, ".gitignore");
  let content = "";
  try { content = fs.readFileSync(gitignorePath, "utf-8"); } catch { return { exists: false, missingPatterns: [] }; }
  const desired = [
    { pattern: "*.local-backup", description: "Local backup env files" },
    { pattern: "*.local", description: "Local config files" },
    { pattern: ".wrangler/", description: "Cloudflare Wrangler state" },
    { pattern: ".next/", description: "Next.js build output" },
    { pattern: ".astro/", description: "Astro build cache" },
    { pattern: "**/target/docs/", description: "Generated playbook documentation" },
    { pattern: "assets/brand/explorations/", description: "Brand design explorations" },
  ];
  const missing = desired.filter((d) => !content.includes(d.pattern));
  return { exists: true, missingPatterns: missing };
}

function findInternalEndpoints(files) {
  const endpoints = [];
  const pattern = /https?:\/\/api\.(deepseek|minimax|moonshot|kimi)\.(com|cn|io)[^\s"')\]}]*/gi;
  for (const file of files) {
    if (shouldExclude(file)) continue;
    if (!/\.(yml|yaml|json|ts|md)$/.test(file)) continue;
    const fullPath = path.join(REPO_ROOT, file);
    let content;
    try { content = fs.readFileSync(fullPath, "utf-8"); } catch { continue; }
    let match;
    while ((match = pattern.exec(content)) !== null) {
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
      hasSecretDetection = /secret|SECRET|sk-|api[_-]?key/i.test(content);
    } catch {}
  }
  return { exists, hasSecretDetection };
}

// --- Main ---
log("Starting comprehensive security audit...");
log("");

const trackedFiles = getTrackedFiles();
log(`Scanned ${trackedFiles.length} tracked files`);

const fileSizes = getTrackedFilesWithSize();

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
log(`Gitignore: ${gitignoreCoverage.missingPatterns.length} missing patterns`);

const endpoints = findInternalEndpoints(trackedFiles);
log(`Found ${endpoints.length} internal API endpoint references`);

const precommit = checkPrecommitHook();
log(`Pre-commit hook: ${precommit.exists ? "exists" : "missing"}`);

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
      secrets.length === 0 && trackedEnvFiles.length === 0 &&
      largeFiles.length === 0 && buildArtifacts.length === 0 &&
      hardcodedPaths.length === 0 &&
      gitignoreCoverage.missingPatterns.length === 0 &&
      precommit.exists && precommit.hasSecretDetection,
  },
  secrets,
  trackedEnvFiles: trackedEnvFiles.map((f) => ({ path: f })),
  largeFiles,
  buildArtifacts: buildArtifacts.map((f) => ({ path: f })),
  hardcodedPaths,
  gitignore: { exists: gitignoreCoverage.exists, missingPatterns: gitignoreCoverage.missingPatterns },
  internalEndpoints: endpoints,
  precommitHook: precommit,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
log("");
log(`Audit report written to ${OUT_FILE}`);
log(`Overall: ${report.summary.isClean ? "CLEAN" : "ISSUES FOUND — review the report"}`);

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
    for (const f of trackedEnvFiles) log(`    ${f}`);
  }
  if (largeFiles.length > 0) {
    log(`  - ${largeFiles.length} large files`);
    for (const f of largeFiles.slice(0, 10)) log(`    ${f.path} (${f.size_human})`);
  }
  process.exit(1);
}
