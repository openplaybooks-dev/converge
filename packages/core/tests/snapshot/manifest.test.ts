/**
 * RFC 0019 — Snapshot manifest tests.
 */
import { describe, it, expect } from "vitest";
import {
  decideEmbedding,
  redactEnv,
  sha256Hex,
  BUNDLE_PATHS,
  DEFAULT_EMBED_MAX_BYTES,
  DEFAULT_SECRET_KEYS,
} from "../../src/snapshot/manifest.ts";

describe("decideEmbedding", () => {
  it("embeds when bytes <= maxBytes (default 5 MB)", () => {
    expect(
      decideEmbedding({
        bytes: 1024,
        sourcePath: "/abs/file.bin",
        sha256: "deadbeef",
      }),
    ).toEqual({ kind: "embed", bytes: 1024 });
  });

  it("refs when bytes > maxBytes", () => {
    expect(
      decideEmbedding({
        bytes: 10 * 1024 * 1024,
        sourcePath: "/abs/big.bin",
        sha256: "abc123",
      }),
    ).toEqual({
      kind: "ref",
      path: "/abs/big.bin",
      sha256: "abc123",
      bytes: 10 * 1024 * 1024,
    });
  });

  it("honors a custom maxBytes", () => {
    expect(
      decideEmbedding({
        bytes: 200,
        sourcePath: "/abs/x",
        sha256: "z",
        maxBytes: 100,
      }),
    ).toEqual({ kind: "ref", path: "/abs/x", sha256: "z", bytes: 200 });
  });

  it("default ceiling is 5 MB", () => {
    expect(DEFAULT_EMBED_MAX_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("redactEnv", () => {
  it("redacts vars whose name contains TOKEN / KEY / SECRET / PASSWORD", () => {
    const out = redactEnv({
      ANTHROPIC_API_KEY: "sk-xxx",
      MY_PASSWORD: "p",
      ACCESS_TOKEN: "t",
      AWS_SECRET_ACCESS_KEY: "x",
      HOME: "/home/me",
      PATH: "/usr/bin",
    });
    expect(out.ANTHROPIC_API_KEY).toBe("[REDACTED]");
    expect(out.MY_PASSWORD).toBe("[REDACTED]");
    expect(out.ACCESS_TOKEN).toBe("[REDACTED]");
    expect(out.AWS_SECRET_ACCESS_KEY).toBe("[REDACTED]");
    expect(out.HOME).toBe("/home/me");
    expect(out.PATH).toBe("/usr/bin");
  });

  it("is case-insensitive on the substring match", () => {
    const out = redactEnv({ my_token: "abc" });
    expect(out.my_token).toBe("[REDACTED]");
  });

  it("accepts user-extended secret patterns", () => {
    const out = redactEnv({ MY_CUSTOM_PII: "sensitive" }, ["PII"]);
    expect(out.MY_CUSTOM_PII).toBe("[REDACTED]");
  });

  it("does not redact non-secret names", () => {
    expect(redactEnv({ ECDSA_CURVE_NAME: "P-256" }).ECDSA_CURVE_NAME).toBe(
      "P-256",
    );
  });

  it("ships the expected default secret-key list", () => {
    expect(DEFAULT_SECRET_KEYS).toContain("TOKEN");
    expect(DEFAULT_SECRET_KEYS).toContain("ANTHROPIC_API_KEY");
  });
});

describe("sha256Hex", () => {
  it("hashes a string and a buffer identically", () => {
    const s = sha256Hex("hello");
    const b = sha256Hex(Buffer.from("hello"));
    expect(s).toBe(b);
    expect(s).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});

describe("BUNDLE_PATHS", () => {
  it("exposes the canonical bundle path layout", () => {
    expect(BUNDLE_PATHS.task).toBe("TASK.md");
    expect(BUNDLE_PATHS.metadata).toBe("metadata.json");
    expect(BUNDLE_PATHS.envJson).toBe("env.json");
    expect(BUNDLE_PATHS.toolCalls).toBe("tool-calls.jsonl");
    expect(BUNDLE_PATHS.inputDir).toBe("inputs/");
    expect(BUNDLE_PATHS.outputDir).toBe("outputs/");
  });
});
