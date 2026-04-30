"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { presentStatus, type RunState } from "@/lib/status-style";

export interface TaskNodeData {
  id: string;
  title: string;
  inputs: string[];
  outputs: string[];
  blocking?: boolean;
  selected?: boolean;
  status?: RunState;
}

export function TaskNode({ data }: NodeProps) {
  const d = data as unknown as TaskNodeData;
  const presented = presentStatus(d.status);
  const decorated = d.status && d.status !== "pending";
  const showStatusChip = decorated;

  return (
    <div
      className={cn(
        "min-w-[220px] max-w-[260px] rounded-lg border bg-[var(--color-card)] shadow-sm transition-shadow",
        d.selected ? "ring-2 ring-offset-2 ring-offset-[var(--color-background)] ring-[var(--color-ring)]" : "",
        presented.animated && "animate-pulse",
      )}
      style={{
        borderColor: decorated ? presented.color : "var(--color-border)",
        background: decorated
          ? `linear-gradient(0deg, ${presented.tint}, ${presented.tint}), var(--color-card)`
          : undefined,
      }}
      role="group"
      aria-label={`Task ${d.id} — ${presented.label}`}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-2"
        style={{
          borderColor: decorated ? presented.color : "var(--color-border)",
        }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: presented.color }}
              aria-hidden="true"
            />
            <div className="truncate font-mono text-[11px] text-[var(--color-muted-foreground)]">
              {d.id}
            </div>
          </div>
          <div className="mt-0.5 truncate text-[13px] font-medium leading-tight">
            {d.title}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {d.blocking ? (
            <span className="rounded-full bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
              blocking
            </span>
          ) : null}
          {showStatusChip ? (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: presented.tint, color: presented.color }}
            >
              {presented.label}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-2 text-[11px]">
        <Port label="in" globs={d.inputs} />
        <Port label="out" globs={d.outputs} />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "var(--color-primary)",
          width: 8,
          height: 8,
          border: "1.5px solid var(--color-card)",
        }}
        aria-label="Inputs"
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: "var(--color-primary)",
          width: 8,
          height: 8,
          border: "1.5px solid var(--color-card)",
        }}
        aria-label="Outputs"
      />
    </div>
  );
}

function Port({ label, globs }: { label: string; globs: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
        {label}
      </div>
      {globs.length === 0 ? (
        <div className="text-[var(--color-muted-foreground)]/60">—</div>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {globs.slice(0, 4).map((g) => (
            <li
              key={g}
              className="truncate font-mono text-[var(--color-muted-foreground)]"
              title={g}
            >
              {g}
            </li>
          ))}
          {globs.length > 4 ? (
            <li className="text-[var(--color-muted-foreground)]/60">
              +{globs.length - 4} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
