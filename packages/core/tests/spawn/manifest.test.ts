/**
 * RFC 0021 — manifest schema validation tests.
 *
 * The manifest is JSONL: one JSON object per line. The schema is strict —
 * unknown fields are rejected with a clear "unknown-field" error so the AI
 * gets explicit feedback instead of silent drops.
 */
import { describe, it, expect } from "vitest";
import {
  parseManifestText,
  type SpawnRow,
} from "../../src/task/spawn/manifest.ts";

describe("parseManifestText", () => {
  it("parses a 3-row valid manifest", () => {
    const text = [
      `{"id":"a","template":"t1"}`,
      `{"id":"b","template":"t2","vars":{"k":"v"}}`,
      `{"id":"c","template":"t3","after":["a","b"]}`,
    ].join("\n");

    const result = parseManifestText(text);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toEqual<SpawnRow>({ id: "a", template: "t1" });
    expect(result.rows[1].vars).toEqual({ k: "v" });
    expect(result.rows[2].after).toEqual(["a", "b"]);
  });

  it("tolerates // comment lines and blank lines", () => {
    const text = [
      `// header comment`,
      ``,
      `{"id":"a","template":"t1"}`,
      `// another note`,
      `{"id":"b","template":"t2"}`,
      ``,
    ].join("\n");

    const result = parseManifestText(text);

    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("rejects unknown fields with errorCode unknown-field", () => {
    const text = `{"id":"a","template":"t1","tags":["x"]}`;

    const result = parseManifestText(text);

    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errorCode).toBe("unknown-field");
    expect(result.errors[0].error).toMatch(/tags/);
    expect(result.errors[0].lineNumber).toBe(1);
  });

  it("rejects rows missing required fields", () => {
    const text = [
      `{"template":"t1"}`,           // missing id
      `{"id":"b"}`,                   // missing template
    ].join("\n");

    const result = parseManifestText(text);

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].error).toMatch(/id/);
    expect(result.errors[1].error).toMatch(/template/);
  });

  it("reports JSON parse errors with line numbers", () => {
    const text = [
      `{"id":"a","template":"t1"}`,
      `not-valid-json`,
    ].join("\n");

    const result = parseManifestText(text);

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].lineNumber).toBe(2);
    expect(result.errors[0].errorCode).toBe("internal");
  });

  it("accepts vars with string, number, boolean values", () => {
    const text = `{"id":"a","template":"t","vars":{"s":"x","n":42,"b":true}}`;

    const result = parseManifestText(text);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].vars).toEqual({ s: "x", n: 42, b: true });
  });

  it("accepts no_inherit boolean", () => {
    const text = `{"id":"a","template":"t","no_inherit":true}`;

    const result = parseManifestText(text);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].no_inherit).toBe(true);
  });

  it("rejects vars with array or object values", () => {
    const text = `{"id":"a","template":"t","vars":{"k":["x"]}}`;

    const result = parseManifestText(text);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errorCode).toBe("unknown-field");
  });
});
