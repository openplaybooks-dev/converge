import "server-only";
import { discoverPlaybooks, loadPlaybook } from "@converge/core/studio-api";
import { findConvergeRoot } from "@converge/project-root";
import {
  deriveArtifacts,
  deriveDataFlowEdges,
  scanTasks,
  type ScannedArtifact,
  type ScannedTask,
} from "@/lib/tasks-scanner";

export function resolveProjectRoot(): string {
  const fromEnv = process.env.CONVERGE_ROOT;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const found = findConvergeRoot(process.cwd());
  if (found) return found;
  return process.cwd();
}

export async function listPlaybooks() {
  const root = resolveProjectRoot();
  const sources = await discoverPlaybooks(root);
  return { root, sources };
}

export async function getPlaybook(name: string) {
  const root = resolveProjectRoot();
  return loadPlaybook(name, root);
}

export interface PlaybookDetail {
  name: string;
  description?: string;
  templateDir: string;
  builtin: boolean;
  mode: string;
  inputs: { name: string; description?: string; required?: boolean }[];
  tasks: ScannedTask[];
  artifacts: ScannedArtifact[];
  dataFlow: { from: string; to: string; via: string }[];
}

export async function getPlaybookDetail(
  name: string,
): Promise<PlaybookDetail | null> {
  const source = await getPlaybook(name);
  if (!source) return null;

  const tasks = await scanTasks(source.templateDir);
  const artifacts = deriveArtifacts(tasks);
  const dataFlow = deriveDataFlowEdges(tasks);

  const inputsRecord = (source.def.inputs ?? {}) as Record<
    string,
    { description?: string; required?: boolean } | undefined
  >;
  const inputs = Object.entries(inputsRecord).map(([key, value]) => ({
    name: key,
    description: value?.description,
    required: value?.required,
  }));

  return {
    name: source.def.name,
    description: source.def.description,
    templateDir: source.templateDir,
    builtin: source.builtin,
    mode: source.def.run?.mode ?? "oneoff",
    inputs,
    tasks,
    artifacts,
    dataFlow,
  };
}
