"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export interface TaskNodeData {
  id: string;
  title: string;
  inputs: string[];
  outputs: string[];
  blocking?: boolean;
  selected?: boolean;
}

export function TaskNode({ data }: NodeProps) {
  const d = data as unknown as TaskNodeData;
  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[260px] rounded-lg border bg-[var(--color-card)] shadow-sm",
        d.selected
          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40"
          : "border-[var(--color-border)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-xs font-mono text-[var(--color-muted-foreground)]">
            {d.id}
          </div>
          <div className="truncate text-sm font-medium">{d.title}</div>
        </div>
        {d.blocking ? (
          <span className="shrink-0 rounded-full bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
            blocking
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-2 text-[11px]">
        <div>
          <div className="mb-1 text-[var(--color-muted-foreground)]">in</div>
          {d.inputs.length === 0 ? (
            <div className="text-[var(--color-muted-foreground)]/60">—</div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {d.inputs.slice(0, 4).map((g) => (
                <li
                  key={g}
                  className="truncate font-mono text-[var(--color-muted-foreground)]"
                  title={g}
                >
                  {g}
                </li>
              ))}
              {d.inputs.length > 4 ? (
                <li className="text-[var(--color-muted-foreground)]/60">
                  +{d.inputs.length - 4}
                </li>
              ) : null}
            </ul>
          )}
        </div>
        <div>
          <div className="mb-1 text-[var(--color-muted-foreground)]">out</div>
          {d.outputs.length === 0 ? (
            <div className="text-[var(--color-muted-foreground)]/60">—</div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {d.outputs.slice(0, 4).map((g) => (
                <li
                  key={g}
                  className="truncate font-mono text-[var(--color-muted-foreground)]"
                  title={g}
                >
                  {g}
                </li>
              ))}
              {d.outputs.length > 4 ? (
                <li className="text-[var(--color-muted-foreground)]/60">
                  +{d.outputs.length - 4}
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "var(--color-primary)" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "var(--color-primary)" }}
      />
    </div>
  );
}
