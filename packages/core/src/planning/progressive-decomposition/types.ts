/**
 * Shared types for progressive decomposition.
 */

export interface PlanLayerOpts {
  /** Absolute path to the node being planned (playbook root or task dir). */
  nodePath: string;
  /** Whether the node is a playbook root or a task. */
  nodeKind: "playbook-root" | "task";
  /** Absolute path to the playbook root (where playbook.yml lives). */
  playbookRoot: string;
  /** Absolute path to the project directory (cwd). */
  projectDir: string;
  /** Optional user prompt (-p). At a fresh root, substitutes for idea.md. */
  prompt?: string;
  /** Re-plan in place (revise existing PLAN.md and child set). */
  update: boolean;
  /** Recursion depth (internal). */
  depth?: number;
  /** Max recursion depth safety net (internal). */
  maxDepth?: number;
  /** Root analysis mode — plans top-level only, allows >7 children. */
  isRoot?: boolean;
}

export type PlanMode = "fresh" | "fill-in" | "update";

/** A child's kind — drives which phase-2 implementer runs. */
export type ChildKind = "executable" | "container" | "seed";

/** Frontmatter summary parsed out of a PLAN.md. */
export interface PlanMeta {
  kind: "task" | "container";
  children?: Array<{
    id: string;
    kind: ChildKind;
    title?: string;
  }>;
}

/** The scope packet — root → ancestors → me. O(depth), never O(tree). */
export interface ScopeAncestor {
  path: string;
  plan?: string;
  task?: string;
}

export interface ScopePacket {
  brief?: string;
  playbookYml?: string;
  rootPlan?: string;
  ancestors: ScopeAncestor[];
  myTask?: string;
  previousPlan?: string;
}

export const DEFAULT_MAX_DEPTH = 8;
export const PHASE_TIMEOUT_MS = 240_000;
