/**
 * RFC 0012 — Doctor as a pre-flight phase (part 1: env-var resolver +
 * check registry).
 *
 * Ships the deterministic pieces of preflight: env-var extraction from
 * `${VAR}` references, a check-registry type, and an aggregator that
 * runs checks and renders a final pass/fail summary. Part 2 wires this
 * into `converge run` as the first phase and adds the bin-on-PATH +
 * provider-ping checks.
 */

export type PreflightStatus = "pass" | "fail" | "warn";

export interface PreflightCheckResult {
  id: string;
  status: PreflightStatus;
  message: string;
  /** Optional remediation hint. */
  fix?: string;
}

export interface PreflightCheck {
  id: string;
  description: string;
  /**
   * Whether this check runs in the fast default profile or only in
   * `--preflight=full`. Fast checks must complete in <1s aggregate.
   */
  profile: "fast" | "full";
  run: () => Promise<PreflightCheckResult> | PreflightCheckResult;
}

export interface PreflightSummary {
  results: PreflightCheckResult[];
  passed: number;
  failed: number;
  warned: number;
}

/**
 * Run a list of checks, optionally filtered by profile. Always runs
 * every check (no short-circuit on first fail) so the user sees the
 * full picture in one pass.
 */
export async function runPreflight(
  checks: PreflightCheck[],
  profile: "fast" | "full" = "fast",
): Promise<PreflightSummary> {
  const selected =
    profile === "full" ? checks : checks.filter((c) => c.profile === "fast");
  const results: PreflightCheckResult[] = [];
  for (const c of selected) {
    try {
      const r = await c.run();
      results.push({ ...r, id: c.id });
    } catch (err: any) {
      results.push({
        id: c.id,
        status: "fail",
        message: `Check threw: ${String(err?.message ?? err)}`,
      });
    }
  }
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const warned = results.filter((r) => r.status === "warn").length;
  return { results, passed, failed, warned };
}

/* ------------------------------------------------------------------ */
/*  Env-var resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Walk an arbitrary YAML-derived object tree and return every unique
 * `${VAR}` / `$VAR` reference found in string values. Quoted dollar
 * signs (`\$VAR`) are skipped — they pass through as literal text.
 */
export function extractEnvRefs(
  node: unknown,
  out: Set<string> = new Set(),
): Set<string> {
  if (node == null) return out;
  if (typeof node === "string") {
    for (const m of node.matchAll(/(?<!\\)\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g))
      out.add(m[1]);
    for (const m of node.matchAll(/(?<!\\)\$([A-Za-z_][A-Za-z0-9_]*)\b/g))
      out.add(m[1]);
    return out;
  }
  if (Array.isArray(node)) {
    for (const v of node) extractEnvRefs(v, out);
    return out;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>))
      extractEnvRefs(v, out);
  }
  return out;
}

/**
 * Build a preflight check that asserts every referenced env var is set
 * in the supplied environment. Returns a single composite result.
 */
export function envVarsCheck(args: {
  config: unknown;
  env?: NodeJS.ProcessEnv;
}): PreflightCheck {
  return {
    id: "env-vars-present",
    description:
      "Every ${VAR} referenced in project.yml is set in the environment",
    profile: "fast",
    run: () => {
      const env = args.env ?? process.env;
      const refs = [...extractEnvRefs(args.config)].sort();
      const missing = refs.filter((name) => !(name in env) || env[name] === "");
      if (refs.length === 0) {
        return {
          id: "env-vars-present",
          status: "pass" as const,
          message: "No env vars referenced",
        };
      }
      if (missing.length === 0) {
        return {
          id: "env-vars-present",
          status: "pass" as const,
          message: `All ${refs.length} env vars set (${refs.join(", ")})`,
        };
      }
      return {
        id: "env-vars-present",
        status: "fail" as const,
        message: `Missing env vars: ${missing.join(", ")}`,
        fix: `Export ${missing.map((n) => `${n}=...`).join(" ")} before running converge`,
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Summary rendering                                                 */
/* ------------------------------------------------------------------ */

export function formatPreflightSummary(s: PreflightSummary): string {
  const lines: string[] = ["Preflight checks:"];
  for (const r of s.results) {
    const icon = r.status === "pass" ? "✓" : r.status === "warn" ? "⚠" : "✗";
    lines.push(`  ${icon} ${r.id} — ${r.message}`);
    if (r.status === "fail" && r.fix) lines.push(`     fix: ${r.fix}`);
  }
  if (s.failed > 0) {
    lines.push("");
    lines.push(
      `Run aborted: ${s.failed} preflight failure${s.failed === 1 ? "" : "s"}.`,
    );
    lines.push(
      "  Fix the failure or re-run with --skip-preflight (not recommended).",
    );
  }
  return lines.join("\n");
}
