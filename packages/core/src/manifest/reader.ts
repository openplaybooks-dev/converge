import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Manifest, RunState } from "./types.js";
import { MANIFEST_VERSION, ManifestVersionError } from "./types.js";

export async function readManifest(targetDir: string): Promise<Manifest | null> {
  const manifestPath = join(targetDir, "target", "manifest.json");

  let raw: string;
  try {
    raw = await readFile(manifestPath, "utf-8");
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Manifest;

  if (parsed.metadata.manifest_version !== MANIFEST_VERSION) {
    throw new ManifestVersionError(
      MANIFEST_VERSION,
      parsed.metadata.manifest_version ?? 0,
    );
  }

  return parsed;
}

export async function readRunState(targetDir: string): Promise<RunState | null> {
  const path = join(targetDir, "target", "runstate.json");

  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }

  return JSON.parse(raw) as RunState;
}
