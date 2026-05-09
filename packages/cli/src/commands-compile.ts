import { readFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import {
  hashTaskFrontmatter,
  hashTaskBody,
  hashTaskChecks,
  hashUpstream,
} from "@converge/core/hash/index.ts";
import { writeManifest, writeRunState } from "@converge/core/manifest/index.ts";
import { buildDagFromPlaybook, splitContainerNodes, injectRootNodes } from "@converge/core";
import { discoverStaticChildren } from "@converge/core";
import type { ManifestNode, Manifest, RunState } from "@converge/core/manifest/types.ts";

export interface CompileOptions {
  dir: string;
  seed?: boolean;
  select?: string;
}

export async function compileCommand(options: CompileOptions): Promise<void> {
  const projectDir = resolve(options.dir);
  const playbookPath = join(projectDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    console.error(`No playbook.yml found at ${projectDir}`);
    process.exit(1);
  }

  const playbookYaml = readFileSync(playbookPath, "utf-8");
  const playbook = parseYaml(playbookYaml) as Record<string, unknown>;
  const playbookName = String(playbook.name || "default");

  // ── 1. Build DAG from playbook.yml (top-level tasks only) ──────
  const idToPath = new Map<string, string>();
  const { dag, errors, globalChecks } = buildDagFromPlaybook(projectDir);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`  ✗ ${err.type}: ${err.message}`);
    }
    if (errors.some((e) => e.type === "cycle")) {
      console.error("DAG has dependency cycles — cannot compile.");
      process.exit(1);
    }
  }

  // ── 2. Discover static children (filesystem → DAG) ────────────
  discoverStaticChildren(dag, idToPath);

  // ── 2b. Apply diverge/converge split + root nodes ─────────────
  splitContainerNodes(dag);
  injectRootNodes(dag, playbookName);

  // ── 3. Build manifest nodes from DAG ──────────────────────────
  const concreteNodes: Record<string, unknown> = {};
  const frontierNodes: Record<string, unknown> = {};

  for (const [nodeId, node] of dag.nodes) {
    const td = node.taskDef;
    const checksArr = Array.isArray(td.checks) ? td.checks : [];
    const inputsArr = Array.isArray(td.inputs) ? td.inputs : [];
    const outputsArr = Array.isArray(td.outputs) ? td.outputs : [];

    const hasSeed = !!(td as any).seed || !!(td as any).seedFn;
    const isFrontier = hasSeed && node.children.length === 0;

    const baseNode = {
      id: nodeId,
      depends_on: node.depends_on ?? [],
      depended_on_by: node.depended_on_by ?? [],
      tags: td.tags ?? [],
      agent: (td as any).ai?.provider ?? td.agent,
      checks: checksArr.map((c: any) => ({
        id: c.id ?? "",
        description: c.description ?? "",
        cmd: c.cmd ?? "",
      })),
      inputs: inputsArr,
      outputs: outputsArr,
      frontmatter_hash: hashTaskFrontmatter({
        title: td.title,
        description: td.description,
        depends_on: td.depends_on,
        inputs: td.inputs,
        outputs: td.outputs,
        checks: td.checks,
        tags: td.tags,
      } as any),
      body_hash: hashTaskBody(td.prompt ?? td.title ?? nodeId),
      checks_hash: hashTaskChecks(checksArr as any),
      inputs_hash: hashTaskChecks(inputsArr.map((s: unknown) => ({ id: String(s ?? "") })) as Array<Record<string, unknown>>),
      upstream_hash: "",
      dag_type: node.type,
      converge_passthrough: node.convergePassthrough ?? false,
    };

    if (isFrontier) {
      frontierNodes[nodeId] = {
        ...baseNode,
        state: "frontier",
        seed_parent: playbookName,
      };
    } else {
      concreteNodes[nodeId] = {
        ...baseNode,
        state: "concrete",
        path: node.path ?? join(projectDir, "tasks", nodeId),
        seed: hasSeed ? String((td as any).seed ?? "") : null,
      };
    }
  }

  // ── 4. Compute upstream hashes ────────────────────────────────
  function computeUpstreamHash(taskName: string, depends_on: string[]) {
    const node = (concreteNodes[taskName] ?? frontierNodes[taskName]) as Record<string, unknown> | undefined;
    if (!node || depends_on.length === 0) return;

    const parentHashes = depends_on
      .filter((d) => concreteNodes[d] || frontierNodes[d])
      .map((d) => {
        const parent = (concreteNodes[d] ?? frontierNodes[d]) as Record<string, unknown>;
        return {
          frontmatter: String(parent.frontmatter_hash ?? ""),
          body: String(parent.body_hash ?? ""),
          inputs: String((parent as any).inputs_hash ?? ""),
        };
      });

    if (parentHashes.length > 0) {
      node.upstream_hash = hashUpstream(parentHashes);
    }
  }

  const allNodeIds = [...Object.keys(concreteNodes), ...Object.keys(frontierNodes)];
  for (const taskName of allNodeIds) {
    const node = (concreteNodes[taskName] ?? frontierNodes[taskName]) as Record<string, unknown>;
    const deps = (node?.depends_on as string[]) ?? [];
    computeUpstreamHash(taskName, deps);
  }

  // ── 5. Build parent/child maps ────────────────────────────────
  const allNodes: Record<string, unknown> = { ...concreteNodes, ...frontierNodes };
  const parent_map: Record<string, string[]> = {};
  const child_map: Record<string, string[]> = {};
  for (const [id, node] of Object.entries(allNodes)) {
    const n = node as { depends_on?: string[]; depended_on_by?: string[] };
    parent_map[id] = (n.depends_on ?? []).slice();
    child_map[id] = (n.depended_on_by ?? []).slice();
  }

  const playbookHash = `sha256:${createHash("sha256").update(playbookYaml).digest("hex")}`;
  const frontierCount = Object.keys(frontierNodes).length;

  // Resolve project root by walking up from the playbook directory
  // until we find .converge/ directory.
  let projectRoot = projectDir;
  while (!existsSync(join(projectRoot, ".converge")) && projectRoot !== resolve(projectRoot, "..")) {
    projectRoot = resolve(projectRoot, "..");
  }

  // ── 6. Write manifest to journal ───────────────────────────────
  const targetDir = join(projectRoot, ".converge", "journal", playbookName);
  mkdirSync(targetDir, { recursive: true });

  const manifest = {
    metadata: {
      playbook: playbookName,
      playbook_hash: playbookHash,
      manifest_version: 1,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      frontier_count: frontierCount,
    },
    nodes: allNodes,
    parent_map,
    child_map,
  };

  await writeManifest(targetDir, manifest as Parameters<typeof writeManifest>[1]);

  // ── 7. Write initial runstate ──────────────────────────────────
  const runstateNodes: Record<string, any> = {};
  for (const [nodeId, node] of dag.nodes) {
    const td = node.taskDef as any;
    runstateNodes[nodeId] = {
      id: nodeId,
      status: "pending",
      attempts: 0,
      duration_ms: 0,
      depends_on: node.depends_on ?? [],
      depended_on_by: node.depended_on_by ?? [],
      title: node.taskDef.title ?? nodeId,
      description: node.taskDef.description ?? "",
      inputs: node.taskDef.inputs ?? [],
      outputs: node.taskDef.outputs ?? [],
      checks: (node.taskDef.checks ?? []).map((c: any) => ({
        id: c.id ?? "",
        description: c.description ?? "",
        cmd: c.cmd ?? "",
      })),
      tags: node.taskDef.tags ?? [],
      journal_path: nodeId,
      source_path: node.path ?? "",
      spawned_children: node.children ?? [],
      seed: td.seed ?? null,
      dag_type: node.type,
      converge_passthrough: node.convergePassthrough ?? false,
      task_def: {
        title: node.taskDef.title,
        description: node.taskDef.description,
        inputs: node.taskDef.inputs ?? [],
        outputs: node.taskDef.outputs ?? [],
        checks: (node.taskDef.checks ?? []).map((c: any) => ({
          id: c.id ?? "",
          description: c.description ?? "",
          cmd: c.cmd ?? "",
        })),
        tags: node.taskDef.tags ?? [],
        agent: node.taskDef.agent,
        skill: node.taskDef.skill,
        vars: node.taskDef.vars,
        body: td.body ?? td.prompt ?? "",
      },
    };
  }

  const runstate: RunState = {
    metadata: {
      execution_id: "compile",
      selector: "",
      playbook: playbookName,
      status: "complete",
      playbook_hash: playbookHash,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      total_nodes: dag.nodes.size,
    },
    dag: {
      nodes: runstateNodes,
      edges: Array.from(dag.nodes.values()).flatMap((n) =>
        n.depends_on.map((dep) => ({ from: dep, to: n.id })),
      ),
      roots: dag.roots.map((r) => r.id),
    },
  };

  await writeRunState(targetDir, runstate);

  console.log(`Compiled ${playbookName}: ${dag.nodes.size} nodes (${Object.keys(frontierNodes).length} frontier)`);
  console.log(`  manifest → ${join(targetDir, "manifest.json")}`);
  console.log(`  runstate → ${join(targetDir, "runstate.json")}`);
}
