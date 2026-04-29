import "server-only";
import { discoverPlaybooks, loadPlaybook } from "@converge/core/studio-api";
import { findConvergeRoot } from "@converge/project-root";

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
