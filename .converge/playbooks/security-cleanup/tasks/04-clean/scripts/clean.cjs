/**
 * Artifact cleaner — removes generated build caches, large design files,
 * and generated documentation from git tracking. Updates .gitignore with
 * missing patterns.
 *
 * Reads .converge/security-cleanup/audit.json for existing findings.
 * Writes .converge/security-cleanup/clean-log.json.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MAX_BUFFER = 50 * 1024 * 1024;
function exec(cmd, opts) {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: MAX_BUFFER, ...opts });
}

const REPO_ROOT = exec("git rev-parse --show-toplevel").trim();

const LOG_FILE = path.join(
  REPO_ROOT,
  ".converge",
  "security-cleanup",
  "clean-log.json",
);

function log(msg) {
  console.log(`[clean] ${msg}`);
}

function gitRmCached(pattern) {
  try {
    // Check if any files match the pattern in git
    const result = execSync(`git ls-files ${pattern}`, {
      cwd: REPO_ROOT,
      encoding: "utf-8",
    }).trim();

    if (!result) {
      log(`No files match ${pattern} — skipping`);
      return [];
    }

    const files = result.split("\n").filter(Boolean);
    execSync(`git rm --cached -r ${pattern}`, {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    log(`git rm --cached -r ${pattern} (${files.length} files)`);
    return files;
  } catch (e) {
    log(`WARNING: git rm failed for ${pattern}: ${e.message}`);
    return [];
  }
}

function updateGitignore() {
  const gitignorePath = path.join(REPO_ROOT, ".gitignore");
  let content = fs.readFileSync(gitignorePath, "utf-8");

  const patternsToAdd = [
    { pattern: "*.local-backup", description: "Local backup env files" },
    { pattern: "*.local", description: "Local config files" },
    { pattern: ".wrangler/", description: "Cloudflare Wrangler state" },
    { pattern: ".next/", description: "Next.js build output" },
    { pattern: ".astro/", description: "Astro build cache" },
    {
      pattern: "**/target/docs/",
      description: "Generated playbook documentation",
    },
    {
      pattern: "assets/brand/explorations/",
      description: "Brand design explorations (use Git LFS if needed)",
    },
  ];

  const added = [];
  for (const { pattern, description } of patternsToAdd) {
    if (!content.includes(pattern)) {
      content += `\n${pattern}`;
      added.push({ pattern, description });
      log(`Added to .gitignore: ${pattern}`);
    }
  }

  if (added.length > 0) {
    fs.writeFileSync(gitignorePath, content);
    log(`Updated .gitignore with ${added.length} new patterns`);
  } else {
    log(".gitignore already covers all desired patterns");
  }

  return added;
}

// --- Main ---

log("Starting artifact cleanup...");

const removed = {
  buildCaches: [],
  generatedDocs: [],
  brandExplorations: [],
};

// 1. Remove build caches
log("Removing build caches...");
removed.buildCaches.push(...gitRmCached(".next/"));
removed.buildCaches.push(...gitRmCached(".wrangler/"));
removed.buildCaches.push(...gitRmCached(".astro/"));
removed.buildCaches.push(...gitRmCached("apps/planner/.next/"));
removed.buildCaches.push(...gitRmCached("apps/landing/.astro/"));
removed.buildCaches.push(...gitRmCached("apps/landing/.wrangler/"));

// 2. Remove generated playbook documentation
log("Removing generated playbook docs...");
removed.generatedDocs.push(
  ...gitRmCached(".converge/playbooks/*/target/docs/"),
);

// 3. Remove brand exploration PNGs
log("Removing brand exploration assets...");
removed.brandExplorations.push(
  ...gitRmCached("assets/brand/explorations/"),
);

// 4. Update .gitignore
log("Updating .gitignore...");
const gitignoreAdded = updateGitignore();

// Write log
const cleanLog = {
  timestamp: new Date().toISOString(),
  removed: {
    totalFiles:
      removed.buildCaches.length +
      removed.generatedDocs.length +
      removed.brandExplorations.length,
    buildCaches: removed.buildCaches,
    generatedDocs: removed.generatedDocs,
    brandExplorations: removed.brandExplorations,
  },
  gitignore: {
    patternsAdded: gitignoreAdded.length,
    added: gitignoreAdded,
  },
  note: "Files were removed from git tracking (git rm --cached). They remain on disk but will not be committed. Consider adding them to .gitignore if not already present.",
};

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
fs.writeFileSync(LOG_FILE, JSON.stringify(cleanLog, null, 2));

const totalRemoved =
  removed.buildCaches.length +
  removed.generatedDocs.length +
  removed.brandExplorations.length;

log("");
log(
  `Clean complete. ${totalRemoved} files removed from git tracking, ${gitignoreAdded.length} .gitignore patterns added.`,
);
log(`Log written to ${LOG_FILE}`);
