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
import { TaskNode } from "@/components/designer/task-node";
import { layoutDag } from "@/lib/graph-layout";
import { wouldCreateCycle } from "@/lib/cycles";

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
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
}

export function PlaybookGraph({
  playbookName,
  tasks,
  dataFlow,
  selectedId,
  onSelect,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "saving"; label: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

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
        labelStyle: { fontSize: 10, fontFamily: "monospace" },
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
      },
    }));

    return { nodes, edges: allEdges };
  }, [tasks, dataFlow, selectedId]);

  const writeDeps = useCallback(
    async (
      targetId: string,
      nextDeps: string[],
      label: string,
    ): Promise<boolean> => {
      setStatus({ kind: "saving", label });
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
        setStatus({ kind: "idle" });
        router.refresh();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setStatus({ kind: "error", message });
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
        setStatus({
          kind: "error",
          message: `Refused: ${conn.source} → ${conn.target} would create a cycle`,
        });
        return;
      }
      const next = [...target.dependencies, conn.source];
      void writeDeps(target.id, next, `Linking ${conn.source} → ${conn.target}`);
    },
    [tasks, taskById, writeDeps],
  );

  const onEdgesDelete = useCallback(
    async (toDelete: Edge[]) => {
      const hard = toDelete.filter((e) => e.id.startsWith(HARD_EDGE_PREFIX));
      if (hard.length === 0) return;

      // Group removals by target so we issue one PUT per affected task.
      const removalsByTarget = new Map<string, Set<string>>();
      for (const e of hard) {
        let set = removalsByTarget.get(e.target);
        if (!set) {
          set = new Set();
          removalsByTarget.set(e.target, set);
        }
        set.add(e.source);
      }

      for (const [targetId, sources] of removalsByTarget) {
        const target = taskById.get(targetId);
        if (!target) continue;
        const next = target.dependencies.filter((d) => !sources.has(d));
        const ok = await writeDeps(
          targetId,
          next,
          `Unlinking ${[...sources].join(", ")} → ${targetId}`,
        );
        if (!ok) break;
      }
    },
    [taskById, writeDeps],
  );

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

      <StatusBadge
        status={status}
        onDismiss={() => setStatus({ kind: "idle" })}
      />
    </div>
  );
}

function StatusBadge({
  status,
  onDismiss,
}: {
  status:
    | { kind: "idle" }
    | { kind: "saving"; label: string }
    | { kind: "error"; message: string };
  onDismiss: () => void;
}) {
  if (status.kind === "idle") return null;

  if (status.kind === "saving") {
    return (
      <div className="pointer-events-none absolute right-4 top-4 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs shadow">
        <span className="text-[var(--color-muted-foreground)]">Saving · </span>
        {status.label}
      </div>
    );
  }

  return (
    <div className="absolute right-4 top-4 flex items-start gap-2 rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)] shadow">
      <span className="font-medium">Error</span>
      <span className="max-w-[280px]">{status.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-[var(--color-danger)]/80 hover:text-[var(--color-danger)]"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
