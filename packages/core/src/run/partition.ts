import { execSync } from "node:child_process";

const SAFE_KEY_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function resolvePartitionKey(
  partitionBy: { cmd?: string; param?: string } | undefined,
  vars: Record<string, string>,
  cliOverride?: string,
): string | null {
  if (!partitionBy && !cliOverride) return null;

  let key: string;

  if (cliOverride) {
    key = cliOverride.trim();
  } else if (partitionBy?.cmd) {
    const raw = execSync(partitionBy.cmd, {
      encoding: "utf-8",
      timeout: 10_000,
    });
    key = raw.trim().replace(/^["']|["']$/g, "");
  } else if (partitionBy?.param) {
    const value = vars[partitionBy.param];
    if (value === undefined) {
      throw new Error(
        `partitionBy.param references variable "${partitionBy.param}" which is not defined in vars`,
      );
    }
    key = String(value).trim();
  } else {
    return null;
  }

  if (!key) {
    throw new Error("Partition key resolved to an empty string");
  }

  if (!SAFE_KEY_PATTERN.test(key)) {
    throw new Error(
      `Partition key "${key}" contains unsafe characters. Must match /^[a-zA-Z0-9._-]+$/`,
    );
  }

  return key;
}
