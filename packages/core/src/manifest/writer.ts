import { writeFile, rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { open } from "node:fs/promises";
import type { Manifest, RunResults } from "./types.js";
import { MANIFEST_VERSION } from "./types.js";

async function atomicWrite(
  baseDir: string,
  filename: string,
  data: unknown,
): Promise<void> {
  const targetDir = join(baseDir, "target");
  const tmpPath = join(targetDir, `.${filename}.tmp`);
  const finalPath = join(targetDir, filename);

  await mkdir(targetDir, { recursive: true });

  const content = JSON.stringify(data, null, 2);
  const handle = await open(tmpPath, "w");
  await handle.writeFile(content, "utf-8");
  await handle.sync();
  await handle.close();
  await rename(tmpPath, finalPath);
}

export async function writeManifest(
  targetDir: string,
  manifest: Manifest,
): Promise<void> {
  const toWrite = {
    ...manifest,
    metadata: {
      ...manifest.metadata,
      manifest_version: MANIFEST_VERSION,
    },
  };
  await atomicWrite(targetDir, "manifest.json", toWrite);
}

export async function writeRunResults(
  targetDir: string,
  results: RunResults,
): Promise<void> {
  await atomicWrite(targetDir, "run_results.json", results);
}
