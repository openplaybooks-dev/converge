import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

export { writeRunState } from "./writer.js";
export { readRunState } from "./reader.js";

export async function hashOutputs(
  projectDir: string,
  outputPaths: string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const relPath of outputPaths) {
    const absPath = join(projectDir, relPath);
    const content = await readFile(absPath);
    const hash = createHash("sha256").update(content).digest("hex");
    result[relPath] = `sha256:${hash}`;
  }
  return result;
}
