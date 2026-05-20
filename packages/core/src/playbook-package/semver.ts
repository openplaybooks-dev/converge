/**
 * RFC 0014 — Playbook-as-versioned-package (part 1: semver + package
 * state schema).
 *
 * Ships the version-handling primitives that the fetch / diff / upgrade
 * paths will all sit on. Part 2 lands `converge add --from-playbook`
 * and the fetcher; part 3 the 3-way merge / upgrade flow.
 *
 * We deliberately avoid a runtime semver dependency for now — the parse
 * + compare we need is small enough to own.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
}

export interface PackageState {
  /** Source the playbook was installed from (e.g. github.com/openplaybooks/baby-app). */
  source: string;
  /** Version that was installed. */
  version: string;
  /** Version the working copy was last merged with (ancestor of the next upgrade). */
  ancestor: string;
  /** Set true once the user has modified files since the last upgrade. */
  diverged: boolean;
  /** ISO-8601 install / last-upgrade timestamp. */
  installedAt: string;
}

/**
 * Parse `MAJOR.MINOR.PATCH` with an optional `-PRERELEASE` tail. Throws
 * with a descriptive error on malformed input. Build-metadata (`+...`)
 * is preserved-but-ignored: it parses without error but doesn't
 * participate in comparison.
 */
export function parseSemver(s: string): SemVer {
  const m = s.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!m) throw new Error(`Invalid semver: ${s}`);
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4],
  };
}

/**
 * Compare two semvers: -1 if a < b, 0 if equal, 1 if a > b. Prerelease
 * tags compare per spec: any prerelease is < no-prerelease, and
 * prerelease tags compare segment-by-segment (numeric ascending,
 * alphanumeric lexically).
 */
export function compareSemver(a: SemVer | string, b: SemVer | string): -1 | 0 | 1 {
  const pa = typeof a === "string" ? parseSemver(a) : a;
  const pb = typeof b === "string" ? parseSemver(b) : b;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  // Same M.m.p — compare prereleases.
  if (pa.prerelease == null && pb.prerelease == null) return 0;
  if (pa.prerelease == null) return 1;  // 1.0.0 > 1.0.0-alpha
  if (pb.prerelease == null) return -1;
  return comparePrerelease(pa.prerelease, pb.prerelease);
}

function comparePrerelease(a: string, b: string): -1 | 0 | 1 {
  const as = a.split(".");
  const bs = b.split(".");
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const ai = as[i];
    const bi = bs[i];
    if (ai == null) return -1; // shorter is less
    if (bi == null) return 1;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) {
      const an = Number(ai); const bn = Number(bi);
      if (an !== bn) return an < bn ? -1 : 1;
    } else if (aNum) {
      return -1; // numeric < alphanumeric
    } else if (bNum) {
      return 1;
    } else if (ai !== bi) {
      return ai < bi ? -1 : 1;
    }
  }
  return 0;
}

/**
 * Classify an upgrade as `major` / `minor` / `patch` / `prerelease` /
 * `same` / `downgrade`. Useful for the upgrade UX warning user about
 * potentially-breaking jumps.
 */
export type UpgradeKind = "major" | "minor" | "patch" | "prerelease" | "same" | "downgrade";

export function classifyUpgrade(from: string, to: string): UpgradeKind {
  const a = parseSemver(from);
  const b = parseSemver(to);
  const cmp = compareSemver(a, b);
  if (cmp === 0) return "same";
  if (cmp === 1) return "downgrade";
  if (a.major !== b.major) return "major";
  if (a.minor !== b.minor) return "minor";
  if (a.patch !== b.patch) return "patch";
  return "prerelease";
}

/* ------------------------------------------------------------------ */
/*  Package-state validation                                          */
/* ------------------------------------------------------------------ */

export function isValidPackageState(s: unknown): s is PackageState {
  if (!s || typeof s !== "object") return false;
  const o = s as Partial<PackageState>;
  return typeof o.source === "string" && o.source.length > 0 &&
    typeof o.version === "string" && tryParse(o.version) &&
    typeof o.ancestor === "string" && tryParse(o.ancestor) &&
    typeof o.diverged === "boolean" &&
    typeof o.installedAt === "string";
}

function tryParse(s: string): boolean {
  try { parseSemver(s); return true; } catch { return false; }
}
