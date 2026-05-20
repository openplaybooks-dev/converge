/**
 * RFC 0012 — Preflight env-var resolver + runner tests.
 */
import { describe, it, expect } from "vitest";
import {
  extractEnvRefs,
  envVarsCheck,
  runPreflight,
  formatPreflightSummary,
  type PreflightCheck,
} from "../../src/preflight/env.ts";

describe("extractEnvRefs", () => {
  it("finds ${VAR} references in strings", () => {
    const refs = extractEnvRefs("hello ${FOO} and ${BAR_BAZ}");
    expect([...refs].sort()).toEqual(["BAR_BAZ", "FOO"]);
  });

  it("finds $VAR references without braces", () => {
    const refs = extractEnvRefs("api_key: $API_KEY");
    expect([...refs]).toEqual(["API_KEY"]);
  });

  it("walks nested objects and arrays", () => {
    const refs = extractEnvRefs({
      providers: [
        { name: "claude", token: "${CLAUDE_TOKEN}" },
        { name: "minimax", token: "${MINIMAX_API_KEY}" },
      ],
      defaults: { region: "$AWS_REGION" },
    });
    expect([...refs].sort()).toEqual(["AWS_REGION", "CLAUDE_TOKEN", "MINIMAX_API_KEY"]);
  });

  it("ignores backslash-escaped dollar signs", () => {
    const refs = extractEnvRefs("price: \\$5.00");
    expect([...refs]).toEqual([]);
  });

  it("dedupes repeated refs", () => {
    const refs = extractEnvRefs(["$FOO", "${FOO}", "$FOO"]);
    expect([...refs]).toEqual(["FOO"]);
  });

  it("returns empty set for nullish / non-string-bearing input", () => {
    expect(extractEnvRefs(null).size).toBe(0);
    expect(extractEnvRefs(undefined).size).toBe(0);
    expect(extractEnvRefs(42).size).toBe(0);
  });
});

describe("envVarsCheck", () => {
  it("passes when no refs exist", () => {
    const check = envVarsCheck({ config: { static: "value" }, env: {} });
    return Promise.resolve(check.run()).then((r) => {
      expect(r.status).toBe("pass");
      expect(r.message).toMatch(/No env vars referenced/);
    });
  });

  it("passes when all refs are set", () => {
    const check = envVarsCheck({
      config: { key: "${API_KEY}", region: "${AWS_REGION}" },
      env: { API_KEY: "x", AWS_REGION: "us" },
    });
    return Promise.resolve(check.run()).then((r) => expect(r.status).toBe("pass"));
  });

  it("fails listing missing refs", () => {
    const check = envVarsCheck({
      config: { key: "${API_KEY}", token: "${TOKEN}" },
      env: { API_KEY: "x" },
    });
    return Promise.resolve(check.run()).then((r) => {
      expect(r.status).toBe("fail");
      expect(r.message).toContain("TOKEN");
      expect(r.message).not.toContain("API_KEY");
      expect(r.fix).toContain("TOKEN=");
    });
  });

  it("treats empty-string env var as missing", () => {
    const check = envVarsCheck({ config: "${X}", env: { X: "" } });
    return Promise.resolve(check.run()).then((r) => expect(r.status).toBe("fail"));
  });
});

describe("runPreflight", () => {
  const mkCheck = (id: string, status: "pass" | "fail" | "warn", profile: "fast" | "full" = "fast"): PreflightCheck => ({
    id,
    description: id,
    profile,
    run: () => ({ id, status, message: `${id}: ${status}` }),
  });

  it("runs every check in fast profile and tallies results", async () => {
    const s = await runPreflight([
      mkCheck("a", "pass"),
      mkCheck("b", "fail"),
      mkCheck("c", "warn"),
    ]);
    expect(s.passed).toBe(1);
    expect(s.failed).toBe(1);
    expect(s.warned).toBe(1);
    expect(s.results.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("skips 'full'-only checks in fast profile", async () => {
    const s = await runPreflight([
      mkCheck("fast1", "pass", "fast"),
      mkCheck("full1", "pass", "full"),
    ], "fast");
    expect(s.results.map((r) => r.id)).toEqual(["fast1"]);
  });

  it("includes 'full' checks when profile is 'full'", async () => {
    const s = await runPreflight([
      mkCheck("fast1", "pass", "fast"),
      mkCheck("full1", "pass", "full"),
    ], "full");
    expect(s.results.map((r) => r.id)).toEqual(["fast1", "full1"]);
  });

  it("captures thrown errors as fail results (no short-circuit)", async () => {
    const s = await runPreflight([
      {
        id: "boom", description: "x", profile: "fast",
        run: () => { throw new Error("kaboom"); },
      },
      mkCheck("after-boom", "pass"),
    ]);
    expect(s.results).toHaveLength(2);
    expect(s.results[0].status).toBe("fail");
    expect(s.results[0].message).toContain("kaboom");
    expect(s.results[1].status).toBe("pass");
  });
});

describe("formatPreflightSummary", () => {
  it("renders a multi-line block including fix hints on fail", async () => {
    const s = await runPreflight([
      {
        id: "x", description: "x", profile: "fast",
        run: () => ({ id: "x", status: "fail", message: "broken", fix: "do this" }),
      },
    ]);
    const out = formatPreflightSummary(s);
    expect(out).toContain("✗ x");
    expect(out).toContain("fix: do this");
    expect(out).toContain("Run aborted: 1 preflight failure");
  });
});
