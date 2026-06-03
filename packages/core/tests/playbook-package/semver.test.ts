/**
 * RFC 0014 — Semver + package-state tests.
 */
import { describe, it, expect } from "vitest";
import {
  parseSemver,
  compareSemver,
  classifyUpgrade,
  isValidPackageState,
} from "../../src/playbook-package/semver.ts";

describe("parseSemver", () => {
  it("parses MAJOR.MINOR.PATCH", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
  });

  it("accepts a leading 'v'", () => {
    expect(parseSemver("v0.3.2")).toEqual({ major: 0, minor: 3, patch: 2 });
  });

  it("parses prerelease tags", () => {
    expect(parseSemver("1.0.0-alpha.1")).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: "alpha.1",
    });
  });

  it("tolerates build metadata but doesn't expose it", () => {
    expect(parseSemver("1.2.3+sha.abc")).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
    });
  });

  it("rejects malformed strings", () => {
    expect(() => parseSemver("1.2")).toThrow();
    expect(() => parseSemver("a.b.c")).toThrow();
    expect(() => parseSemver("1.2.3.4")).toThrow();
  });
});

describe("compareSemver", () => {
  it("compares major/minor/patch numerically", () => {
    expect(compareSemver("1.0.0", "2.0.0")).toBe(-1);
    expect(compareSemver("1.2.0", "1.10.0")).toBe(-1);
    expect(compareSemver("1.0.10", "1.0.2")).toBe(1);
  });

  it("equal versions compare to 0", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("prerelease < release at the same M.m.p", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0")).toBe(-1);
    expect(compareSemver("1.0.0", "1.0.0-rc.1")).toBe(1);
  });

  it("compares prerelease segments correctly", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0-beta")).toBe(-1);
    expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha.2")).toBe(-1);
    expect(compareSemver("1.0.0-alpha.10", "1.0.0-alpha.2")).toBe(1);
    expect(compareSemver("1.0.0-alpha", "1.0.0-alpha.1")).toBe(-1);
  });

  it("numeric prerelease < alphanumeric per spec", () => {
    expect(compareSemver("1.0.0-1", "1.0.0-alpha")).toBe(-1);
  });
});

describe("classifyUpgrade", () => {
  it("major / minor / patch", () => {
    expect(classifyUpgrade("1.2.3", "2.0.0")).toBe("major");
    expect(classifyUpgrade("1.2.3", "1.3.0")).toBe("minor");
    expect(classifyUpgrade("1.2.3", "1.2.4")).toBe("patch");
  });

  it("same and downgrade", () => {
    expect(classifyUpgrade("1.2.3", "1.2.3")).toBe("same");
    expect(classifyUpgrade("1.3.0", "1.2.0")).toBe("downgrade");
  });

  it("prerelease change at same M.m.p", () => {
    expect(classifyUpgrade("1.0.0-alpha", "1.0.0-beta")).toBe("prerelease");
  });
});

describe("isValidPackageState", () => {
  const good = {
    source: "github.com/openplaybooks/baby-app",
    version: "1.2.0",
    ancestor: "1.1.0",
    diverged: false,
    installedAt: "2026-05-19T00:00:00Z",
  };

  it("accepts a well-formed state", () => {
    expect(isValidPackageState(good)).toBe(true);
  });

  it("rejects missing fields", () => {
    expect(isValidPackageState({ ...good, source: "" })).toBe(false);
    expect(isValidPackageState({})).toBe(false);
    expect(isValidPackageState(null)).toBe(false);
  });

  it("rejects malformed version strings", () => {
    expect(isValidPackageState({ ...good, version: "x" })).toBe(false);
    expect(isValidPackageState({ ...good, ancestor: "1.0" })).toBe(false);
  });

  it("rejects wrong-typed diverged flag", () => {
    expect(isValidPackageState({ ...good, diverged: "yes" })).toBe(false);
  });
});
