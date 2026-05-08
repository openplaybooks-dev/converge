/**
 * Secret purger — replaces hardcoded API keys with environment variable
 * placeholders, removes tracked .env files, creates .env.example templates.
 *
 * Reads .converge/security-cleanup/audit.json for the list of secrets.
 * Writes .converge/security-cleanup/purge-log.json with replacement log.
 *
 * SAFETY: This only operates on the WORKING TREE. It does NOT rewrite git
 * history. Use `git filter-branch` or `git filter-repo` separately for that.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MAX_BUFFER = 50 * 1024 * 1024;
function exec(cmd, opts) {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: MAX_BUFFER, ...opts });
}

const REPO_ROOT = exec("git rev-parse --show-toplevel").trim();

const AUDIT_FILE = path.join(
  REPO_ROOT,
  ".converge",
  "security-cleanup",
  "audit.json",
);
const LOG_FILE = path.join(
  REPO_ROOT,
  ".converge",
  "security-cleanup",
  "purge-log.json",
);

// Mapping of secret prefixes → replacement strategies
// Keys match the `secret_prefix` field from audit.json
function getReplacement(secret, filePath) {
  const prefix = secret.secret_prefix.replace("...", "").substring(0, 8);

  // Determine the env var name based on provider and file context
  const isYamlConfig =
    filePath.includes("project.yml") || filePath.includes("project.yaml");
  const isTsFile = filePath.endsWith(".ts");
  const isEnvFile = filePath.endsWith(".env") || filePath.includes(".env.");
  const isMdFile = filePath.endsWith(".md");

  const provider = secret.provider;
  const providerUpper = provider.toUpperCase().replace(/-/g, "_");

  if (isYamlConfig) {
    return {
      envVar: `${providerUpper}_API_KEY`,
      replacement: `"\${${providerUpper}_API_KEY}"`,
      description: `Replaced ${provider} key in YAML config with env var reference`,
    };
  }

  if (isTsFile) {
    return {
      envVar: `${providerUpper}_API_KEY`,
      replacement: `process.env.${providerUpper}_API_KEY`,
      description: `Replaced ${provider} key in TypeScript with env var`,
    };
  }

  if (isMdFile) {
    return {
      envVar: `${providerUpper}_API_KEY`,
      replacement: `$YOUR_${providerUpper}_API_KEY`,
      description: `Replaced ${provider} key in markdown with placeholder`,
    };
  }

  if (isEnvFile) {
    return {
      envVar: `${providerUpper}_API_KEY`,
      replacement: `your-${provider}-api-key-here`,
      description: `Replaced ${provider} key in .env with placeholder`,
    };
  }

  // Default
  return {
    envVar: `${providerUpper}_API_KEY`,
    replacement: `\${${providerUpper}_API_KEY}`,
    description: `Replaced ${provider} key with env var reference`,
  };
}

function log(msg) {
  console.log(`[purge] ${msg}`);
}

// --- Main ---

log("Loading audit report...");
const audit = JSON.parse(fs.readFileSync(AUDIT_FILE, "utf-8"));
const { secrets, trackedEnvFiles } = audit;

if (secrets.length === 0 && trackedEnvFiles.length === 0) {
  log("Nothing to purge — audit is clean.");
  const purgeLog = {
    timestamp: new Date().toISOString(),
    secretsReplaced: 0,
    envFilesRemoved: 0,
    envExamplesCreated: 0,
    replacements: [],
  };
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.writeFileSync(LOG_FILE, JSON.stringify(purgeLog, null, 2));
  log("Purge log written.");
  process.exit(0);
}

const replacements = [];

// --- Phase 1: Replace secrets in source files ---

// Group secrets by file for efficient processing
const secretsByFile = {};
for (const secret of secrets) {
  if (!secretsByFile[secret.file]) secretsByFile[secret.file] = [];
  secretsByFile[secret.file].push(secret);
}

for (const [file, fileSecrets] of Object.entries(secretsByFile)) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) {
    log(`WARNING: ${file} not found on disk — skipping`);
    continue;
  }

  let content = fs.readFileSync(fullPath, "utf-8");
  let modified = false;

  for (const secret of fileSecrets) {
    const { envVar, replacement, description } = getReplacement(
      secret,
      file,
    );

    // Build the exact string to find and replace
    // The context field contains the full line, we need to extract the key value
    const secretFull = secret.secret_full || secret.pattern;

    // Try to find the key by its prefix pattern in the file
    const prefix = secret.secret_prefix.replace("...", "");
    const prefixShort = prefix.substring(0, 12);

    if (content.includes(prefixShort)) {
      // Find the quoted string containing this prefix and replace
      const regex = new RegExp(
        `(["']?)${prefixShort.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[A-Za-z0-9_-]{10,}(["']?)`,
        "g",
      );

      const newContent = content.replace(regex, (match, q1, q2) => {
        // Preserve quoting style if it was quoted
        if (q1 && q2 && q1 === q2) {
          return q1 + replacement + q2;
        }
        // If it was `key: "value"` style in YAML, replace just the value
        if (match.includes('"') || match.includes("'")) {
          return replacement;
        }
        return replacement;
      });

      if (newContent !== content) {
        content = newContent;
        modified = true;
        replacements.push({
          file,
          provider: secret.provider,
          envVar,
          action: "replaced",
          description,
        });
        log(`Replaced ${secret.provider} key in ${file}`);
      }
    }

    // Also handle the case where the key is on a line like `KEY=value` or `KEY: "value"`
    for (const line of content.split("\n")) {
      if (line.includes(prefixShort)) {
        // The key is in this line — find and replace the value after = or :
        const keyRegex =
          /(ANTHROPIC_AUTH_TOKEN|ANTHROPIC_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|KIMI_API_KEY|MESHY_API_KEY|GROK_API_KEY|KLINGAI_ACCESS_KEY|KLINGAI_SECRET_KEY|CODEX_API_KEY|MINIMAX_API_KEY)\s*[:=]\s*["']?([^"'\s]+)["']?/gi;

        let lineMatch;
        while ((lineMatch = keyRegex.exec(line)) !== null) {
          const keyName = lineMatch[1];
          const oldValue = lineMatch[2];
          if (oldValue.includes(prefixShort.substring(0, 8))) {
            // Replace in content
            content = content.replace(
              lineMatch[0],
              `${keyName}: ${replacement}`,
            );
            modified = true;
            if (
              !replacements.find(
                (r) => r.file === file && r.envVar === envVar,
              )
            ) {
              replacements.push({
                file,
                provider: secret.provider,
                envVar,
                action: "replaced-line",
                description: `Replaced ${keyName} in ${file}`,
              });
            }
            log(`Replaced ${keyName} in ${file}`);
          }
        }
      }
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content);
    log(`  -> Wrote ${file}`);
  }
}

// --- Phase 2: Remove tracked .env files ---

const envFilesRemoved = [];
for (const envFile of trackedEnvFiles) {
  const filePath = envFile.path || envFile;
  const fullPath = path.join(REPO_ROOT, filePath);

  // Create .env.example from the .env file (with sanitized values)
  const envDir = path.dirname(filePath);
  const examplePath = path.join(
    envDir,
    filePath.endsWith(".env.local-backup")
      ? ".env.example"
      : filePath.replace(".env", ".env.example"),
  );

  if (fs.existsSync(fullPath)) {
    let envContent = fs.readFileSync(fullPath, "utf-8");

    // Replace any real keys with placeholder values
    envContent = envContent.replace(
      /(GEMINI_API_KEY|OPENAI_API_KEY|MESHY_API_KEY|ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|KIMI_API_KEY|GROK_API_KEY|KLINGAI_ACCESS_KEY|KLINGAI_SECRET_KEY|CODEX_API_KEY|MINIMAX_API_KEY)\s*=\s*.+/gi,
      "$1=YOUR_API_KEY_HERE",
    );

    // Save .env.example
    const fullExamplePath = path.join(REPO_ROOT, examplePath);
    fs.mkdirSync(path.dirname(fullExamplePath), { recursive: true });
    fs.writeFileSync(
      fullExamplePath,
      envContent +
        "\n# Copy this file to .env and fill in your API keys\n# .env is gitignored — never commit it\n",
    );
    log(`Created ${examplePath}`);
  }

  // git rm --cached the .env file
  try {
    execSync(`git rm --cached "${filePath}"`, {
      cwd: REPO_ROOT,
      stdio: "pipe",
    });
    envFilesRemoved.push(filePath);
    log(`git rm --cached ${filePath}`);
  } catch (e) {
    log(`WARNING: Could not git rm ${filePath}: ${e.message}`);
  }
}

// --- Phase 3: Remove hardcoded local paths ---

const LOCAL_PATH_FILES = [
  ".claude/settings.local.json",
  // Add more as found by audit
];

for (const file of LOCAL_PATH_FILES) {
  const fullPath = path.join(REPO_ROOT, file);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf-8");
  const originalContent = content;

  // Replace /Users/... paths with relative equivalents or placeholders
  content = content.replace(
    /\/Users\/[a-zA-Z0-9_-]+\/Documents\/converge/g,
    ".",
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    log(`Replaced local paths in ${file}`);
    replacements.push({
      file,
      action: "removed-local-paths",
      description: `Replaced /Users/ paths with relative paths in ${file}`,
    });
  }
}

// --- Write log ---

const purgeLog = {
  timestamp: new Date().toISOString(),
  secretsReplaced: replacements.filter(
    (r) => r.action === "replaced" || r.action === "replaced-line",
  ).length,
  envFilesRemoved: envFilesRemoved.length,
  envFiles: envFilesRemoved,
  envExamplesCreated: envFilesRemoved.length,
  replacements: replacements,
  note: "Git history has NOT been rewritten. Run `git filter-branch` or `git filter-repo` separately to purge secrets from history if the repo has not been made public yet.",
};

fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
fs.writeFileSync(LOG_FILE, JSON.stringify(purgeLog, null, 2));
log("");
log(`Purge complete. ${replacements.length} replacements, ${envFilesRemoved.length} .env files removed.`);
log(`Log written to ${LOG_FILE}`);
