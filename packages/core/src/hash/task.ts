import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

const FIFTY_MB = 50 * 1024 * 1024;

function sha256(data: string): string {
  return `sha256:${createHash("sha256").update(data).digest("hex")}`;
}

function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(",")}]`;
  }
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sorted.map(
    (k) =>
      `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`,
  );
  return `{${pairs.join(",")}}`;
}

export function hashTaskFrontmatter(fm: Record<string, unknown>): string {
  return sha256(stableStringify(fm));
}

export function hashTaskBody(body: string): string {
  const lines = body.split("\n");
  // Strip trailing empty lines from split before normalizing
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const trimmed = lines.map((l) => l.trimEnd());
  const normalized = trimmed.join("\n") + "\n";
  return sha256(normalized);
}

export function hashTaskChecks(checks: Array<Record<string, unknown>>): string {
  return sha256(stableStringify(checks));
}

export async function hashInputs(paths: string[]): Promise<string> {
  const hash = createHash("sha256");
  for (const p of paths) {
    const s = await stat(p);
    if (s.size > FIFTY_MB) {
      const mb = (s.size / (1024 * 1024)).toFixed(0);
      console.warn(
        `[hash] skipping ${p} (${mb} MB > 50 MB threshold)`,
      );
      hash.update("sha256:skipped-large-file");
      continue;
    }
    const stream = createReadStream(p);
    for await (const chunk of stream) {
      hash.update(chunk as Buffer);
    }
  }
  return `sha256:${hash.digest("hex")}`;
}

export function hashUpstream(
  parents: Array<{ frontmatter: string; body: string; inputs: string }>,
): string {
  const serialized = parents
    .map((p) => `${p.frontmatter}:${p.body}:${p.inputs}`)
    .join(",");
  return sha256(serialized);
}
