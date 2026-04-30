"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TaskNode } from "@/components/designer/task-node";
import { ConfirmDialog } from "@/components/ui/dialog";
import { layoutDag } from "@/lib/graph-layout";
import { wouldCreateCycle } from "@/lib/cycles";
import type { RunState } from "@/lib/status-style";

interface TaskShape {
  id: string;
  title?: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  blocking?: boolean;
}

interface DataFlow {
  from: string;
  to: string;
  via: string;
}

const NODE_W = 240;
const NODE_H = 130;
const HARD_EDGE_PREFIX = "dep:";

const nodeTypes = { task: TaskNode };

interface Props {
  playbookName: string;
  tasks: TaskShape[];
  dataFlow: DataFlow[];
  statuses: Record<string, { state: RunState } | null>;
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
}

interface PendingDelete {
  edges: { source: string; target: string }[];
}

export function PlaybookGraph({
  playbookName,
  tasks,
  dataFlow,
  statuses,
  selectedId,
  onSelect,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<PendingDelete | null>(null);

  const taskById = useMemo(() => {
    const m = new Map<string, TaskShape>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const { nodes, edges } = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));

    const hardEdges: Edge[] = [];
    for (const t of tasks) {
      for (const dep of t.dependencies) {
        if (dep.startsWith("tag:")) continue;
        if (!taskIds.has(dep)) continue;
        hardEdges.push({
          id: `${HARD_EDGE_PREFIX}${dep}->${t.id}`,
          source: dep,
          target: t.id,
          type: "smoothstep",
          animated: false,
          style: { stroke: "var(--color-primary)", strokeWidth: 1.5 },
          deletable: true,
          data: { kind: "dep" },
        });
      }
    }

    const hardKey = new Set(hardEdges.map((e) => `${e.source}->${e.target}`));
    const softEdges: Edge[] = [];
    for (const flow of dataFlow) {
      const key = `${flow.from}->${flow.to}`;
      if (hardKey.has(key)) continue;
      softEdges.push({
        id: `flow:${flow.from}->${flow.to}:${flow.via}`,
        source: flow.from,
        target: flow.to,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "var(--color-muted-foreground)",
          strokeWidth: 1,
          strokeDasharray: "4 3",
        },
        label: flow.via,
        labelStyle: { fontSize: 10, fontFamily: "var(--font-mono)" },
        deletable: false,
        data: { kind: "flow" },
      });
    }

    const allEdges = [...hardEdges, ...softEdges];

    const positions = layoutDag(
      tasks.map((t) => ({ id: t.id, width: NODE_W, height: NODE_H })),
      allEdges.map((e) => ({ source: e.source, target: e.target })),
    );

    const nodes: Node[] = tasks.map((t) => ({
      id: t.id,
      type: "task",
      position: positions[t.id] ?? { x: 0, y: 0 },
      data: {
        id: t.id,
        title: t.title ?? t.id,
        inputs: t.inputs,
        outputs: t.outputs,
        blocking: t.blocking,
        selected: t.id === selectedId,
        status: statuses[t.id]?.state ?? "pending",
      },
    }));

    return { nodes, edges: allEdges };
  }, [tasks, dataFlow, statuses, selectedId]);

  const writeDeps = useCallback(
    async (
      targetId: string,
      nextDeps: string[],
      action: "link" | "unlink",
      label: string,
      undo?: () => void,
    ): Promise<boolean> => {
      const verb = action === "link" ? "Linking" : "Unlinking";
      const toastId = toast.loading(`${verb} ${label}…`);
      try {
        const res = await fetch(
          `/api/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(targetId)}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dependencies: nextDeps }),
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message ?? `HTTP ${res.status}`);
        }
        toast.success(
          action === "link" ? `Linked ${label}` : `Unlinked ${label}`,
          {
            id: toastId,
            action: undo ? { label: "Undo", onClick: undo } : undefined,
          },
        );
        router.refresh();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`${verb} failed`, { id: toastId, description: message });
        return false;
      }
    },
    [playbookName, router],
  );

  const isValidConnection = useCallback(
    (conn: Connection | Edge) => {
      if (!conn.source || !conn.target) return false;
      if (conn.source === conn.target) return false;
      const target = taskById.get(conn.target);
      if (!target) return false;
      if (target.dependencies.includes(conn.source)) return false;
      if (wouldCreateCycle(tasks, conn.source, conn.target)) return false;
      return true;
    },
    [tasks, taskById],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const target = taskById.get(conn.target);
      if (!target) return;
      if (target.dependencies.includes(conn.source)) return;
      if (wouldCreateCycle(tasks, conn.source, conn.target)) {
        toast.error("Cycle would be created", {
          description: `${conn.source} → ${conn.target} forms a cycle`,
        });
        return;
      }
      const next = [...target.dependencies, conn.source];
      const undo = () => {
        void writeDeps(
          target.id,
          target.dependencies,
          "unlink",
          `${conn.source} → ${conn.target}`,
        );
      };
      void writeDeps(
        target.id,
        next,
        "link",
        `${conn.source} → ${conn.target}`,
        undo,
      );
    },
    [tasks, taskById, writeDeps],
  );

  // Confirm-on-delete: gather the hard-dep edges and show a dialog.
  const onEdgesDelete = useCallback((toDelete: Edge[]) => {
    const hard = toDelete.filter((e) => e.id.startsWith(HARD_EDGE_PREFIX));
    if (hard.length === 0) return;
    setConfirm({
      edges: hard.map((e) => ({ source: e.source, target: e.target })),
    });
  }, []);

  const performDelete = useCallback(async () => {
    if (!confirm) return;
    const removalsByTarget = new Map<string, Set<string>>();
    for (const e of confirm.edges) {
      let set = removalsByTarget.get(e.target);
      if (!set) {
        set = new Set();
        removalsByTarget.set(e.target, set);
      }
      set.add(e.source);
    }

    setConfirm(null);

    for (const [targetId, sources] of removalsByTarget) {
      const target = taskById.get(targetId);
      if (!target) continue;
      const next = target.dependencies.filter((d) => !sources.has(d));
      const original = target.dependencies;
      const sourcesArr = [...sources];
      const undo = () => {
        void writeDeps(
          targetId,
          original,
          "link",
          `${sourcesArr.join(", ")} → ${targetId}`,
        );
      };
      const ok = await writeDeps(
        targetId,
        next,
        "unlink",
        `${sourcesArr.join(", ")} → ${targetId}`,
        undo,
      );
      if (!ok) break;
    }
  }, [confirm, taskById, writeDeps]);

  return (
    <div className="relative h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, n) => onSelect?.(n.id)}
          onPaneClick={() => onSelect?.(undefined)}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          isValidConnection={isValidConnection}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} />
          <Controls position="bottom-right" showInteractive={false} />
          <MiniMap
            position="bottom-left"
            zoomable
            pannable
            maskColor="oklch(0 0 0 / 0.1)"
          />
        </ReactFlow>
      </ReactFlowProvider>

      {tasks.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-card)]/80 px-6 py-4 text-center text-sm text-[var(--color-muted-foreground)]">
            <div className="font-medium text-[var(--color-foreground)]">
              No tasks yet
            </div>
            <div className="mt-1 text-xs">
              Add a task in <code>tasks/</code> or use the AI draft on the home
              page to scaffold a playbook.
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title="Remove dependency?"
        description={
          confirm
            ? confirm.edges.length === 1
              ? `Remove the dependency ${confirm.edges[0].source} → ${confirm.edges[0].target}? You'll be able to undo from the toast.`
              : `Remove ${confirm.edges.length} dependencies? You'll be able to undo from the toast.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
