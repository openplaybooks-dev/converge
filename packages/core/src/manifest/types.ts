export const MANIFEST_VERSION = 1;

interface ManifestNodeBase {
  id: string;
  depends_on: string[];
  depended_on_by: string[];
  tags: string[];
  checks: string[];
  inputs: string[];
  outputs: string[];
  frontmatter_hash: string;
  body_hash: string;
  checks_hash: string;
  inputs_hash: string;
  upstream_hash: string;
}

export interface ConcreteNode extends ManifestNodeBase {
  state: "concrete";
  path: string;
  wbs: string | null;
}

export interface ExpectedNode extends ManifestNodeBase {
  state: "expected";
  wbs_parent: string;
  predicted_from: string;
}

export interface FrontierNode extends ManifestNodeBase {
  state: "frontier";
  wbs_parent: string;
}

export type ManifestNode = ConcreteNode | ExpectedNode | FrontierNode;

export interface ManifestMetadata {
  playbook: string;
  playbook_hash?: string;
  manifest_version?: number;
  generated_at: string;
  converge_version: string;
  frontier_count: number;
}

export interface Manifest {
  metadata: ManifestMetadata;
  nodes: Record<string, ManifestNode>;
  child_map: Record<string, string[]>;
  parent_map: Record<string, string[]>;
}

export interface RunResult {
  id: string;
  status: "pass" | "error";
  attempts: number;
  duration_ms: number;
  output_hashes?: Record<string, string>;
  error?: string;
}

export interface RunResults {
  metadata: {
    session_id: string;
    selector: string;
  };
  results: RunResult[];
}

export class ManifestVersionError extends Error {
  constructor(expected: number, found: number) {
    super(`MANIFEST_VERSION mismatch: expected ${expected}, found ${found}`);
    this.name = "ManifestVersionError";
  }
}
