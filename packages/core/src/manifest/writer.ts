import { rename, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { open } from "node:fs/promises";
import type { Manifest, RunState } from "./types.js";
import { MANIFEST_VERSION } from "./types.js";

async function atomicWrite(
  baseDir: string,
  filename: string,
  data: unknown,
): Promise<void> {
  const tmpPath = join(baseDir, `.${filename}.tmp`);
  const finalPath = join(baseDir, filename);

  await mkdir(baseDir, { recursive: true });

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

export async function writeRunState(
  targetDir: string,
  state: RunState,
): Promise<void> {
  await atomicWrite(targetDir, "runstate.json", state);
}
