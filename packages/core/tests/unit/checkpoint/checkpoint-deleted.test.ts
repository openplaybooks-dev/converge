import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const checkpointDir = resolve(__dirname, "../../../src/checkpoint");

const deletedFiles = [
  "manager.ts",
  "filesystem-status.ts",
  "unit-checkpoint.ts",
  "task-checkpoint.ts",
];

describe("checkpoint-deleted", () => {
  for (const file of deletedFiles) {
    it(`${file} should not exist`, () => {
      expect(existsSync(resolve(checkpointDir, file))).toBe(false);
    });
  }
});
