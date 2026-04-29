"use client";

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { TaskNode } from "@/components/designer/task-node";
import { layoutDag } from "@/lib/graph-layout";

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

const nodeTypes = { task: TaskNode };

interface Props {
  tasks: TaskShape[];
  dataFlow: DataFlow[];
  selectedId?: string;
  onSelect?: (id: string | undefined) => void;
}

export function PlaybookGraph({
  tasks,
  dataFlow,
  selectedId,
  onSelect,
}: Props) {
  const { nodes, edges } = useMemo(() => {
    const taskIds = new Set(tasks.map((t) => t.id));

    const hardEdges: Edge[] = [];
    for (const t of tasks) {
      for (const dep of t.dependencies) {
        if (dep.startsWith("tag:")) continue;
        if (!taskIds.has(dep)) continue;
        hardEdges.push({
          id: `dep:${dep}->${t.id}`,
          source: dep,
          target: t.id,
          type: "smoothstep",
          animated: false,
          style: { stroke: "var(--color-primary)", strokeWidth: 1.5 },
          label: undefined,
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

  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          onNodeClick={(_, n) => onSelect?.(n.id)}
          onPaneClick={() => onSelect?.(undefined)}
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
    </div>
  );
}
