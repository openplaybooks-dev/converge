/**
 * safe-id — task-id validation.
 *
 * The grammar must reject every known shape that could escape an
 * inventory or journal path, or get misinterpreted as a CLI flag.
 */

import { describe, it, expect } from "vitest";
import {
  assertSafeId,
  isSafeId,
  InvalidIdError,
} from "../../src/task/goal/safe-id.ts";

describe("assertSafeId", () => {
  describe("accepts canonical formats", () => {
    const valid = [
      "task-1",
      "001-bootstrap",
      "001-bootstrap--02-impl",
      "001-bootstrap--02-impl--01",
      "deeply/nested/id",
      "with.dots.in.it",
      "snake_case_id",
      "A.0.1",
    ];
    for (const id of valid) {
      it(`accepts ${JSON.stringify(id)}`, () => {
        expect(assertSafeId(id)).toBe(id);
        expect(isSafeId(id)).toBe(true);
      });
    }
  });

  describe("rejects path-traversal patterns", () => {
    const traversal = [
      "../escape",
      "../../etc/passwd",
      "foo/../bar",
      "foo/./bar",
      "/absolute",
      "trailing/",
      "..",
      ".",
      "/",
    ];
    for (const id of traversal) {
      it(`rejects ${JSON.stringify(id)}`, () => {
        expect(() => assertSafeId(id)).toThrow(InvalidIdError);
        expect(isSafeId(id)).toBe(false);
      });
    }
  });

  describe("rejects shell-injection patterns", () => {
    const shell = [
      "id; rm -rf /",
      "id && evil",
      "id|pipe",
      "id`backtick`",
      "id$VAR",
      "id with spaces",
      'id"quote',
      "id\\backslash",
      "id\nnewline",
      "id\ttab",
      "id\x00null",
    ];
    for (const id of shell) {
      it(`rejects ${JSON.stringify(id)}`, () => {
        expect(() => assertSafeId(id)).toThrow(InvalidIdError);
      });
    }
  });

  describe("rejects flag-like ids", () => {
    const flags = ["-flag", "--option"];
    for (const id of flags) {
      it(`rejects ${JSON.stringify(id)}`, () => {
        expect(() => assertSafeId(id)).toThrow(InvalidIdError);
      });
    }
  });

  it("rejects empty string", () => {
    expect(() => assertSafeId("")).toThrow(/must not be empty/);
  });

  it("rejects non-string inputs", () => {
    expect(() => assertSafeId(undefined as any)).toThrow(/must be a string/);
    expect(() => assertSafeId(null as any)).toThrow(/must be a string/);
    expect(() => assertSafeId(42 as any)).toThrow(/must be a string/);
    expect(() => assertSafeId({} as any)).toThrow(/must be a string/);
  });

  it("rejects ids over 200 chars", () => {
    const longId = "a".repeat(201);
    expect(() => assertSafeId(longId)).toThrow(/exceeds 200/);
  });

  it("error carries the offending id and reason", () => {
    try {
      assertSafeId("../bad", "task id");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidIdError);
      expect((err as InvalidIdError).id).toBe("../bad");
      expect((err as InvalidIdError).reason).toMatch(/\.\./);
    }
  });
});
