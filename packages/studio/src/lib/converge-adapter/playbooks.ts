import {
  discoverPlaybooks,
  loadPlaybook,
  validatePlaybook,
  PlaybookConfigSchema,
} from "@converge/core/studio-api";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import YAML from "yaml";
import {
  playbooksDir,
  playbookManifestPath,
  playbookDir,
  playbookTasksDir,
  sessionsDir,
  resolveProjectRoot,
} from "./paths";

export interface PlaybookSummary {
  name: string;
  description?: string;
  mode?: string;
  taskCount: number;
  lastSessionAt?: string;
}

export interface NewPlaybookSpec {
  name: string;
  description?: string;
  inputs?: Record<string, { description?: string; required?: boolean }>;
  run?: {
    mode?: "oneoff" | "dispatch" | "converge" | "loop";
    maxTaskAttempts?: number;
    maxDuration?: string;
    resume?: boolean;
    stall?: { maxConsecutive?: number; backoffMs?: number };
  };
  checks?: Array<{ id: string; cmd: string; description?: string }>;
}

async function latestSessionAt(name: string, root: string): Promise<string | undefined> {
  const dir = sessionsDir(name, root);
  let latest: string | undefined;
  let latestTime = 0;

  let entries: Array<{ isDirectory(): boolean; name: string }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const metaPath = path.join(dir, entry.name, "metadata.json");
    let meta: { startedAt?: string };
    try {
      meta = JSON.parse(await fs.readFile(metaPath, "utf8"));
    } catch {
      continue;
    }
    if (meta.startedAt) {
      const t = new Date(meta.startedAt).getTime();
      if (t > latestTime) {
        latestTime = t;
        latest = meta.startedAt;
      }
    }
  }

  return latest;
}

export async function listPlaybooks(root?: string): Promise<PlaybookSummary[]> {
  const resolvedRoot = root ?? resolveProjectRoot();
  const sources = await discoverPlaybooks(resolvedRoot);

  return Promise.all(
    sources.map(async (source) => {
      const { def, templateDir } = source;
      const tasksPath = playbookTasksDir(def.name, resolvedRoot);
      let taskCount = 0;
      try {
        const entries = await fs.readdir(tasksPath, { withFileTypes: true });
        taskCount = entries.filter((e) => e.isDirectory()).length;
      } catch {
        // no tasks dir
      }
      const lastSessionAt = await latestSessionAt(def.name, resolvedRoot);

      return {
        name: def.name,
        description: def.description,
        mode: def.run?.mode,
        taskCount,
        lastSessionAt,
      } satisfies PlaybookSummary;
    })
  );
}

export async function readPlaybook(
  name: string,
  root?: string
): Promise<{ raw: string; parsed: Awaited<ReturnType<typeof loadPlaybook>> }> {
  const resolvedRoot = root ?? resolveProjectRoot();
  const manifestPath = playbookManifestPath(name, resolvedRoot);
  const raw = await fs.readFile(manifestPath, "utf8");
  const parsed = await loadPlaybook(name, resolvedRoot);
  return { raw, parsed };
}

export async function writePlaybook(
  name: string,
  yamlText: string,
  root?: string
): Promise<void> {
  const resolvedRoot = root ?? resolveProjectRoot();
  const manifestPath = playbookManifestPath(name, resolvedRoot);

  const parsed = YAML.parse(yamlText);

  // Validate via PlaybookConfigSchema
  PlaybookConfigSchema.parse(parsed);

  // Also run structural validation
  const source = await loadPlaybook(name, resolvedRoot);
  if (!source) throw new Error(`Playbook "${name}" not found`);
  const errors = validatePlaybook(source.def, source.templateDir);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }

  // Atomic write
  await fs.writeFile(manifestPath + ".tmp", yamlText, "utf8");
  await fs.rename(manifestPath + ".tmp", manifestPath);
}

export async function createPlaybook(spec: NewPlaybookSpec, root?: string): Promise<void> {
  const resolvedRoot = root ?? resolveProjectRoot();

  if (!/^[a-z0-9][a-z0-9-]*$/.test(spec.name)) {
    throw new Error(
      "Playbook name must be a lowercase alphanumeric slug (starts with letter/digit, hyphens allowed after first char)"
    );
  }

  const pbDir = playbookDir(spec.name, resolvedRoot);
  try {
    await fs.access(pbDir);
    throw new Error(`Playbook "${spec.name}" already exists`);
  } catch {
    // expected — dir should not exist
  }

  const yamlDoc: Record<string, unknown> = {
    name: spec.name,
  };
  if (spec.description) yamlDoc.description = spec.description;
  if (spec.inputs) yamlDoc.inputs = spec.inputs;
  if (spec.run) yamlDoc.run = spec.run;
  if (spec.checks) yamlDoc.checks = spec.checks;

  const yamlText = YAML.stringify(yamlDoc);

  await fs.mkdir(pbDir, { recursive: true });
  const manifestPath = playbookManifestPath(spec.name, resolvedRoot);
  await fs.writeFile(manifestPath + ".tmp", yamlText, "utf8");
  await fs.rename(manifestPath + ".tmp", manifestPath);

  await fs.mkdir(playbookTasksDir(spec.name, resolvedRoot), { recursive: true });
}
