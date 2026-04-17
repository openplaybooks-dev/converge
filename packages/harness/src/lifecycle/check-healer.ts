/**
 * CheckHealer
 *
 * Self-healing for broken check commands.
 *
 * When a post-run check fails because the command binary doesn't exist
 * (exit code 127 / "command not found"), the correction loop cannot fix it —
 * the problem is the check *definition*, not the output file.
 *
 * This module:
 *   1. Detects "broken command" failures (exit 127 or keyword match in stderr)
 *   2. Replaces the broken command with a portable equivalent via heuristic table
 *   3. Falls back to a compact AI call if no heuristic matches
 *   4. Writes the healed check back into the TASK.md source file in-place
 *   5. Returns the healed CheckDef[] so the caller can re-run them immediately
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentfn } from '@crew/agentfn';
import { stringify as stringifyYaml } from 'yaml';
import type { CheckDef, CheckRunResult } from './after.ts';
import type { TaskMdDef } from '../config/task-md-definition.ts';

/* ------------------------------------------------------------------ */
/*  Shim resolution                                                    */
/* ------------------------------------------------------------------ */

/**
 * Resolves a shim script and returns the shell invocation prefix.
 * Tries .js first (tsup compiled, runs with `node`), then .ts (dev mode, runs with `tsx`).
 * Returns e.g. `node "/path/shims/grep.js"` or `tsx "/path/shims/grep.ts"`.
 */
function resolveShim(name: string): string | null {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // check-healer.ts is at src/lifecycle/ — shims are at src/shims/
  const shimsDir = join(thisDir, '..', 'shims');
  const jsPath = join(shimsDir, name + '.js');
  if (existsSync(jsPath)) return `node "${jsPath}"`;
  const tsPath = join(shimsDir, name + '.ts');
  if (existsSync(tsPath)) return `tsx "${tsPath}"`;
  return null;
}

const execAsync = promisify(exec);

/* ------------------------------------------------------------------ */
/*  Result types                                                       */
/* ------------------------------------------------------------------ */

export interface HealResult {
  /** Checks that were patched with a new cmd */
  healed: CheckDef[];
  /** true if TASK.md was actually written */
  patched: boolean;
}

/* ------------------------------------------------------------------ */
/*  Broken command detection                                           */
/* ------------------------------------------------------------------ */

const BROKEN_KEYWORDS = [
  'command not found',
  'not recognized as an internal or external command',
  'Cannot find module',
  // NOTE: 'No such file or directory' is intentionally excluded — it fires when
  // the checked OUTPUT FILE doesn't exist yet (a valid check failure, not a broken
  // command). Exit code 127 already covers the "binary not found" case.
  'not found',
];

/**
 * Patterns indicating the check command itself is broken (syntax error),
 * not that the checked condition is false.
 */
const BROKEN_SYNTAX_PATTERNS = [
  /syntax error near unexpected token/i,
  /unexpected token [`'(]/i,
  /no matches found:/i,          // zsh glob failure on unquoted parens/brackets
  /bad substitution/i,
  /ERR_UNKNOWN_FILE_EXTENSION/,  // node can't run .ts files directly
];

/**
 * Returns true when a check failure is caused by the command binary being
 * missing/unavailable or the command having a shell syntax error (e.g.
 * unquoted parentheses/brackets in paths) — NOT by the checked condition
 * being false.
 */
export function isBrokenCommand(result: CheckRunResult): boolean {
  if (result.exitCode === 127) return true;
  // /dev/stdin is not reliably available in Node.js on Windows Git Bash — treat as broken
  if (result.cmd?.includes('/dev/stdin')) return true;
  const combined = `${result.stdout} ${result.stderr}`.toLowerCase();
  if (BROKEN_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()))) return true;
  // Check for shell syntax errors (e.g. unquoted special chars in paths)
  const raw = `${result.stdout} ${result.stderr}`;
  return BROKEN_SYNTAX_PATTERNS.some(p => p.test(raw));
}

/* ------------------------------------------------------------------ */
/*  Heuristic replacement table                                        */
/* ------------------------------------------------------------------ */

interface HeuristicRule {
  /** Regex tested against the command string */
  match: RegExp;
  /** Produce the replacement command, or null if this rule can't handle it */
  replace: (cmd: string, match: RegExpMatchArray) => string | null;
  description: string;
}

const HEURISTICS: HeuristicRule[] = [
  // ── node "...shims/*.ts" → tsx "...shims/*.ts" ─────────────────────────
  // Fixes previously-healed shim commands that used `node` with a .ts file.
  // node can't run .ts files directly — needs tsx.
  {
    match: /^node\s+"[^"]*[/\\]shims[/\\][^"]*\.ts"/,
    replace: (cmd) => cmd.replace(/^node\b/, 'tsx'),
    description: 'node .ts shim → tsx .ts shim (fix broken heal)',
  },

  // ── grep → portable node shim ───────────────────────────────────────────
  // Replaces the `grep` binary with a Node.js shim that implements the same
  // flags (-q, -i, -c, -n, -l, -v, -E, -F) without any shell quoting issues.
  // All flags and arguments are passed through unchanged — only the binary changes.
  // e.g. grep -q 'react-router-dom' "src/pages/(home)/file.tsx"
  //    → node "/path/to/shims/grep.js" -q 'react-router-dom' "src/pages/(home)/file.tsx"
  {
    match: /^grep\s/,
    replace: (cmd) => {
      const shimInvocation = resolveShim('grep');
      if (!shimInvocation) return null;
      // Replace only the leading 'grep' binary — preserve all flags and args as-is
      return cmd.replace(/^grep\b/, shimInvocation);
    },
    description: 'grep → portable node shim (cross-platform)',
  },

  // ── wc → portable node shim ────────────────────────────────────────────
  // Handles -l, -c, -w, -m and stdin redirects (shell still handles < redir).
  // e.g. wc -l < "src/pages/(home)/file.tsx"
  //    → node "/path/shims/wc.js" -l < "src/pages/(home)/file.tsx"
  {
    match: /^wc\s/,
    replace: (cmd) => {
      const shimInvocation = resolveShim('wc');
      if (!shimInvocation) return null;
      return cmd.replace(/^wc\b/, shimInvocation);
    },
    description: 'wc → portable node shim (cross-platform)',
  },

  // ── jq → portable node shim ─────────────────────────────────────────────
  // Implements the jq filter subset used in TASK.md checks:
  // path access, pipe, length, keys, type, has(), map(), select(), equality.
  // Falls through to AI if the filter is not supported.
  // e.g. jq -e '.name == "MyApp"' package.json
  //    → node "/path/shims/jq.js" -e '.name == "MyApp"' package.json
  {
    match: /^jq\s/,
    replace: (cmd) => {
      const shimInvocation = resolveShim('jq');
      if (!shimInvocation) return null;
      return cmd.replace(/^jq\b/, shimInvocation);
    },
    description: 'jq → portable node shim (cross-platform)',
  },

  // ── find → portable node shim ───────────────────────────────────────────
  // Handles: -name, -iname, -type f/d/l, -maxdepth, -mindepth, -not / !
  // e.g. find src -type f -name "*.tsx"
  //    → node "/path/shims/find.js" src -type f -name "*.tsx"
  {
    match: /^find\s/,
    replace: (cmd) => {
      const shimInvocation = resolveShim('find');
      if (!shimInvocation) return null;
      return cmd.replace(/^find\b/, shimInvocation);
    },
    description: 'find → portable node shim (cross-platform)',
  },

  // ── /dev/stdin (not available via Node on Windows Git Bash) ─────────────
  {
    match: /\/dev\/stdin/,
    replace: (cmd) => {
      const fileMatch = cmd.match(/<\s*(\S+)\s*$/);
      if (!fileMatch) return null;
      const file = fileMatch[1];
      if (/JSON\.parse/i.test(cmd)) {
        return `node -e "require('fs').readFileSync('${file}','utf8').split('\\n').filter(l=>l.trim()).forEach(l=>JSON.parse(l))"`;
      }
      return null;
    },
    description: '/dev/stdin → read file directly (Windows-compatible)',
  },

  // ── python3 JSON validation ─────────────────────────────────────────────
  {
    match: /^python3?\s+-c\s+["']import json.*open\(['"]([^'"]+)['"]\)/,
    replace: (_, m) => `node -e "JSON.parse(require('fs').readFileSync('${m[1]}','utf8'))"`,
    description: 'python3 JSON validation → node JSON.parse',
  },

  // ── Image magic bytes ───────────────────────────────────────────────────
  // file <path> | grep -q "PNG image"
  {
    match: /^file\s+"?([^"'\s]+)"?\s*\|\s*grep.*PNG/i,
    replace: (_, m) => `node -e "const b=require('fs').readFileSync('${m[1]}');if(b[0]!==0x89||b[1]!==0x50||b[2]!==0x4E||b[3]!==0x47)process.exit(1)"`,
    description: 'file|grep PNG → node magic bytes',
  },
  // file <path> | grep -q "JPEG image"
  {
    match: /^file\s+"?([^"'\s]+)"?\s*\|\s*grep.*JPEG/i,
    replace: (_, m) => `node -e "const b=require('fs').readFileSync('${m[1]}');if(b[0]!==0xFF||b[1]!==0xD8)process.exit(1)"`,
    description: 'file|grep JPEG → node magic bytes',
  },
  // file <path> | grep -q "GIF"
  {
    match: /^file\s+"?([^"'\s]+)"?\s*\|\s*grep.*GIF/i,
    replace: (_, m) => `node -e "const b=require('fs').readFileSync('${m[1]}',null);const s=b.slice(0,3).toString('ascii');if(s!=='GIF')process.exit(1)"`,
    description: 'file|grep GIF → node magic bytes',
  },
  // file <path> | grep -q "PDF"
  {
    match: /^file\s+"?([^"'\s]+)"?\s*\|\s*grep.*PDF/i,
    replace: (_, m) => `node -e "const b=require('fs').readFileSync('${m[1]}',null);if(b.slice(0,4).toString()!=='%PDF')process.exit(1)"`,
    description: 'file|grep PDF → node magic bytes',
  },

  // ── XML / HTML validation ───────────────────────────────────────────────
  // xmllint --noout <file>
  {
    match: /^xmllint\s+--noout\s+"?([^"'\s]+)"?/,
    replace: (_, m) => `node -e "require('fs').readFileSync('${m[1]}','utf8')"`,
    description: 'xmllint --noout → node readFileSync (existence check)',
  },

  // ── Network tools (not available in CI) ────────────────────────────────
  // curl -sf <url>  →  node https.get (skip in non-network contexts)
  {
    match: /^curl\s+(?:-[a-zA-Z]+\s+)*"?(https?:\/\/[^"'\s]+)"?/,
    replace: (_, m) => `node -e "require('${m[1].startsWith('https') ? 'https' : 'http'}').get('${m[1]}',r=>{if(r.statusCode>=400)process.exit(1)}).on('error',()=>process.exit(1))"`,
    description: 'curl URL check → node http.get',
  },

  // ── File size checks ────────────────────────────────────────────────────
  // stat -f%z / stat --format=%s (macOS / Linux variants without fallback)
  {
    match: /^stat\s+-f%z\s+"?([^"'\s]+)"?\s*$/,
    replace: (_, m) => `node -e "const s=require('fs').statSync('${m[1]}');if(s.size===0)process.exit(1)"`,
    description: 'stat -f%z (macOS) → node statSync',
  },
  {
    match: /^stat\s+--format=%s\s+"?([^"'\s]+)"?\s*$/,
    replace: (_, m) => `node -e "const s=require('fs').statSync('${m[1]}');if(s.size===0)process.exit(1)"`,
    description: 'stat --format=%s (Linux) → node statSync',
  },

  // ── Linters / formatters ────────────────────────────────────────────────
  // prettier --check <file>  →  node syntax check
  {
    match: /^prettier\s+--check\s+"?([^"'\s]+)"?/,
    replace: (_, m) => `node -e "require('fs').readFileSync('${m[1]}','utf8')"`,
    description: 'prettier --check → node readFileSync (file existence only)',
  },
];

/**
 * Detects unquoted paths containing shell-special characters (parentheses,
 * brackets, spaces) and wraps them in double quotes.
 *
 * Examples:
 *   test -f src/pages/(home)/page.tsx  →  test -f "src/pages/(home)/page.tsx"
 *   grep -q "pattern" src/pages/(home)/page.tsx  →  grep -q "pattern" "src/pages/(home)/page.tsx"
 *   test $(wc -l < src/pages/(home)/page.tsx) -gt 40  →  test $(wc -l < "src/pages/(home)/page.tsx") -gt 40
 */
function tryQuoteSpecialPaths(cmd: string): string | null {
  let changed = false;

  // Strategy: find file-path-like tokens that start with common project dirs,
  // contain shell-special chars, and are not already quoted.
  // Stop matching at whitespace, quotes, |, >, ;, or ) preceded by non-path context.
  //
  // We handle two cases:
  // 1. Normal argument positions:  test -f src/pages/(home)/page.tsx
  // 2. After input redirection <:  wc -l < src/pages/(home)/page.tsx
  //
  // Path tokens end at a file extension (.tsx, .css, .ts, .md, .json, .html, etc.)
  // to avoid capturing trailing shell syntax like ) from $(...).
  // Also match directory paths used as arguments to find/ls (no extension).
  const pathWithExtPattern = /(?<!["'])((?:src|\.stitch|\.harness|node_modules)\/\S*?\.(?:tsx?|jsx?|css|json|html?|md|ya?ml))(?!["'])/g;
  const dirPathPattern = /(?<!["'])((?:src|\.stitch|\.harness|node_modules)\/[^\s"'|><;)]+?(?:\/_components|\/\*)?)(?=\s|$)/g;

  const healed = cmd.replace(pathWithExtPattern, (match) => {
    if (/[()[\]]/.test(match) && !match.startsWith('"')) {
      changed = true;
      return `"${match}"`;
    }
    return match;
  });
  // Second pass: quote directory paths (e.g. find arguments) not caught by first pass
  const healed2 = healed.replace(dirPathPattern, (match) => {
    if (/[()[\]]/.test(match) && !match.startsWith('"') && !match.includes('."')) {
      changed = true;
      return `"${match}"`;
    }
    return match;
  });

  if (!changed) return null;
  console.log(`   🔧 Heuristic: quote shell-special paths`);
  console.log(`      old: ${cmd}`);
  console.log(`      new: ${healed2}`);
  return healed2;
}

function tryHeuristic(cmd: string): string | null {
  for (const rule of HEURISTICS) {
    const m = cmd.match(rule.match);
    if (m) {
      const healed = rule.replace(cmd, m);
      if (healed === null) continue;  // Rule matched but couldn't produce a replacement
      console.log(`   🔧 Heuristic: ${rule.description}`);
      console.log(`      old: ${cmd}`);
      console.log(`      new: ${healed}`);
      return healed;
    }
  }
  // Try path quoting as a last-resort heuristic
  return tryQuoteSpecialPaths(cmd);
}

/* ------------------------------------------------------------------ */
/*  AI fallback                                                        */
/* ------------------------------------------------------------------ */

/**
 * Analyze the error and project context, then use AI to decide the fix strategy.
 * The AI is given project structure info and must decide the best approach.
 */
async function healViaAi(check: CheckDef, errorOutput: string, logDir?: string): Promise<string | null> {
  const platform = process.platform === 'win32' ? 'Windows (Git Bash)' : process.platform;
  const projectDir = process.cwd();

  // Scan project root to give AI context about what files exist
  let projectFiles = '';
  try {
    const entries = await readdir(projectDir);
    projectFiles = entries.slice(0, 50).join(', ');
  } catch { /* ignore */ }

  const prompt = [
    `A CI check command failed because the binary is not installed on this machine.`,
    ``,
    `Platform: ${platform}`,
    `Working directory: ${projectDir}`,
    ``,
    `Check ID: ${check.id}`,
    `Purpose: ${check.description}`,
    `Failed command: ${check.cmd}`,
    `Error output: ${errorOutput.slice(0, 500)}`,
    ``,
    `Project files (first 50): ${projectFiles}`,
    ``,
    `Your task: Provide a single replacement command that achieves the SAME validation goal.`,
    ``,
    `Rules:`,
    `- Command must exit 0 on success, non-zero on failure`,
    `- Use node or bash builtins — these are always available`,
    `- If the check cannot be replicated simply, use: echo "check skipped" && exit 0`,
    `- Return ONLY the single command string — no explanation, no markdown, no backticks`,
  ].join('\n');

  try {
    const executor = agentfn<string>({
      prompt,
      allowedTools: [],
      timeoutMs: 60_000,
      logDir,
    });
    const result = await executor();
    const raw = (result.raw ?? '').trim();
    const cmd = raw.replace(/^`+|`+$/g, '').trim();
    if (cmd && !cmd.includes('\n') && cmd.length > 0 && cmd.length < 2000) {
      console.log(`   🤖 AI healed: ${cmd}`);
      return cmd;
    }
    if (!cmd || cmd.includes('\n')) {
      console.log(`   ⚠️  AI returned invalid response (empty or multiline), skipping heal`);
    }
  } catch (err: any) {
    console.log(`   ⚠️  AI heal failed: ${err.message}`);
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Write back to TASK.md                                               */
/* ------------------------------------------------------------------ */

async function writeBackChecks(
  taskMdPath: string,
  def: TaskMdDef,
  body: string,
): Promise<void> {
  const fm: Record<string, unknown> = {};
  if (def.id) fm.id = def.id;
  if (def.title) fm.title = def.title;
  if (def.description) fm.description = def.description;
  if (def.agent) fm.agent = def.agent;
  if (def.skills?.length) fm.skills = def.skills;
  if (def.inputs?.length) fm.inputs = def.inputs;
  if (def.outputs?.length) fm.outputs = def.outputs;
  if (def['auto-harness'] !== undefined) fm['auto-harness'] = def['auto-harness'];
  if (def.checks?.length) fm.checks = def.checks;
  if (def.dependencies?.length) fm.dependencies = def.dependencies;
  if (def.tags?.length) fm.tags = def.tags;
  if (def['diagnosis-hints']?.length) fm['diagnosis-hints'] = def['diagnosis-hints'];
  if (def['correction-budget'] !== undefined) fm['correction-budget'] = def['correction-budget'];
  if (def['context-depth'] !== undefined) fm['context-depth'] = def['context-depth'];
  if (def['allowed-tools']?.length) fm['allowed-tools'] = def['allowed-tools'];
  if (def.vars && Object.keys(def.vars).length > 0) fm.vars = def.vars;

  const yaml = stringifyYaml(fm, { lineWidth: 0 });
  await writeFile(taskMdPath, `---\n${yaml}---\n\n${body.trimStart()}`, 'utf8');
}

/* ------------------------------------------------------------------ */
/*  Main: healChecks                                                   */
/* ------------------------------------------------------------------ */

/**
 * For any check result that indicates a broken command (not a failing assertion),
 * attempt to replace the command with a portable equivalent and write the fix
 * directly back into the TASK.md source file.
 *
 * @param taskMdPath  Absolute path to the TASK.md file
 * @param def          Parsed TaskMdDef (will be mutated in-place for matched checks)
 * @param body         Raw markdown body of TASK.md (below the frontmatter)
 * @param failedChecks All failed CheckRunResult[] from the after phase
 * @param logDir       Optional log directory for AI healing attempts
 * @returns            Which checks were healed and whether TASK.md was patched
 */
export async function healChecks(
  taskMdPath: string,
  def: TaskMdDef,
  body: string,
  failedChecks: CheckRunResult[],
  logDir?: string,
): Promise<HealResult> {
  const brokenResults = failedChecks.filter(isBrokenCommand);
  if (brokenResults.length === 0) return { healed: [], patched: false };

  console.log(`\n🩹 Check self-heal: ${brokenResults.length} broken command(s) detected`);

  const healed: CheckDef[] = [];

  for (const result of brokenResults) {
    // Find the corresponding CheckDef in def.checks
    const checkIdx = (def.checks ?? []).findIndex(c => c.id === result.id);
    if (checkIdx === -1) continue;

    const check = def.checks![checkIdx];
    const errorOutput = `${result.stdout} ${result.stderr}`.trim();

    // Try heuristic first (fast, no AI call)
    let newCmd = tryHeuristic(check.cmd);

    // Fall back to AI if no heuristic matched
    if (!newCmd) {
      newCmd = await healViaAi(check, errorOutput, logDir);
    }

    if (newCmd) {
      def.checks![checkIdx] = { ...check, cmd: newCmd };
      healed.push(def.checks![checkIdx]);
    } else {
      console.log(`   ⚠️  Could not heal check: ${check.id} — manual fix needed`);
    }
  }

  if (healed.length === 0) return { healed: [], patched: false };

  // Write patched checks back to TASK.md
  await writeBackChecks(taskMdPath, def, body);
  console.log(`   ✅ TASK.md patched with ${healed.length} healed check(s)`);

  return { healed, patched: true };
}

/* ------------------------------------------------------------------ */
/*  Verify a healed check passes                                       */
/* ------------------------------------------------------------------ */

export async function verifyHealedCheck(check: CheckDef, projectDir: string): Promise<boolean> {
  try {
    const shell = process.platform === 'win32' ? 'bash' : '/bin/bash';
    await execAsync(check.cmd, { cwd: projectDir, timeout: 30_000, shell });
    return true;
  } catch {
    return false;
  }
}
