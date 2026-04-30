"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  ganttBounds,
  topoLevels,
  type GanttBounds,
} from "@/lib/lens-data";
import { presentStatus, type RunState } from "@/lib/status-style";

interface TaskShape {
  id: string;
  title?: string;
  blocking?: boolean;
  dependencies: string[];
}

interface Props {
  tasks: TaskShape[];
  statuses: Record<
    string,
    {
      state: RunState;
      startedAt?: string;
      completedAt?: string;
      durationMs?: number;
    } | null
  >;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

const ROW_HEIGHT = 28;
const ROW_GAP = 6;
const PADDING_X = 12;
const LABEL_WIDTH = 200;
const TICK_COUNT = 5;

interface Row {
  task: TaskShape;
  state: RunState;
  startMs?: number;
  endMs?: number;
  ghost?: boolean;
}

export function LensGantt({ tasks, statuses, selectedId, onSelect }: Props) {
  // Stamp "now" once per mount so the memo stays pure. Live updates flow
  // through the statuses prop via SSE; this is just the right-edge clamp
  // for in-progress bars.
  const [nowMs] = useState(() => Date.now());

  const { rows, bounds } = useMemo(() => {
    const levels = topoLevels(tasks);

    const liveBounds = ganttBounds(statuses, nowMs);

    // Plot every task. Tasks without timing render as ghost bars placed by
    // topo level so the user gets a structural preview before the first run.
    const rows: Row[] = tasks.map((t) => {
      const s = statuses[t.id];
      if (s?.startedAt) {
        const start = Date.parse(s.startedAt);
        const end = s.completedAt
          ? Date.parse(s.completedAt)
          : (liveBounds?.endMs ?? nowMs);
        return {
          task: t,
          state: s.state,
          startMs: Number.isFinite(start) ? start : undefined,
          endMs: Number.isFinite(end) ? end : undefined,
        };
      }
      return { task: t, state: s?.state ?? "pending", ghost: true };
    });

    rows.sort((a, b) => {
      if (a.startMs && b.startMs) return a.startMs - b.startMs;
      if (a.startMs) return -1;
      if (b.startMs) return 1;
      const la = levels.get(a.task.id) ?? 0;
      const lb = levels.get(b.task.id) ?? 0;
      if (la !== lb) return la - lb;
      return a.task.id.localeCompare(b.task.id);
    });

    return { rows, bounds: liveBounds };
  }, [tasks, statuses, nowMs]);

  if (tasks.length === 0) {
    return <Empty message="No tasks to render." />;
  }

  if (!bounds) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-sm text-[var(--color-muted-foreground)]">
        <div className="rounded-lg border border-dashed border-[var(--color-border)] px-6 py-4 text-center">
          <div className="font-medium">No run data yet</div>
          <div className="mt-1 text-xs">
            Start the playbook to populate a Gantt. The graph and tree views
            still work without any run history.
          </div>
        </div>
      </div>
    );
  }

  const totalHeight = PADDING_X * 2 + rows.length * (ROW_HEIGHT + ROW_GAP);
  const ticks = generateTicks(bounds, TICK_COUNT);

  return (
    <div className="h-full overflow-auto px-6 py-4">
      <div className="mx-auto max-w-5xl">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Run timeline</h2>
          <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
            {new Date(bounds.startMs).toISOString().slice(0, 19)}Z →{" "}
            {new Date(bounds.endMs).toISOString().slice(0, 19)}Z (
            {formatDuration(bounds.spanMs)})
          </span>
        </header>

        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${LABEL_WIDTH}px 1fr` }}
        >
          <div className="pr-3">
            <ul className="flex flex-col" style={{ rowGap: ROW_GAP }}>
              {rows.map((r) => {
                const active = r.task.id === selectedId;
                return (
                  <li
                    key={r.task.id}
                    style={{ height: ROW_HEIGHT }}
                    className="flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onSelect(active ? undefined : r.task.id)
                      }
                      className={cn(
                        "flex w-full items-center gap-2 truncate rounded px-2 py-1 text-left text-xs hover:bg-[var(--color-muted)]",
                        active && "bg-[var(--color-accent)]",
                      )}
                    >
                      <span className="truncate font-mono">{r.task.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div
            className="relative rounded border border-[var(--color-border)] bg-[var(--color-card)]"
            style={{ height: totalHeight }}
          >
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-l border-[var(--color-border)]/60"
                style={{ left: `${(tick.frac * 100).toFixed(2)}%` }}
              >
                <span className="ml-1 mt-1 inline-block font-mono text-[10px] text-[var(--color-muted-foreground)]">
                  {tick.label}
                </span>
              </div>
            ))}

            <ul
              className="relative flex flex-col"
              style={{ rowGap: ROW_GAP, padding: PADDING_X }}
            >
              {rows.map((r) => {
                const presented = presentStatus(r.state);
                const active = r.task.id === selectedId;
                if (r.ghost) {
                  return (
                    <li
                      key={r.task.id}
                      className="relative"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(active ? undefined : r.task.id)}
                        className={cn(
                          "absolute inset-y-1 right-1 rounded border border-dashed text-[10px]",
                          active
                            ? "border-[var(--color-primary)]"
                            : "border-[var(--color-border)]",
                        )}
                        style={{ width: "10%" }}
                        title="Not yet run"
                      />
                    </li>
                  );
                }

                const left =
                  ((r.startMs! - bounds.startMs) / bounds.spanMs) * 100;
                const width = Math.max(
                  0.6,
                  ((r.endMs! - r.startMs!) / bounds.spanMs) * 100,
                );
                return (
                  <li
                    key={r.task.id}
                    className="relative"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(active ? undefined : r.task.id)}
                      className={cn(
                        "absolute inset-y-1 rounded border text-left text-[10px] font-mono leading-tight",
                        active
                          ? "ring-2 ring-[var(--color-primary)]/40"
                          : "",
                        r.state === "running" && "animate-pulse",
                      )}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: presented.tint,
                        borderColor: presented.color,
                        color: presented.color,
                      }}
                      title={`${r.task.title ?? r.task.id} · ${presented.label}`}
                    >
                      <span className="truncate px-1.5">{r.task.id}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateTicks(
  bounds: GanttBounds,
  count: number,
): { frac: number; label: string }[] {
  const out: { frac: number; label: string }[] = [];
  for (let i = 0; i <= count; i++) {
    const frac = i / count;
    const ms = bounds.startMs + frac * bounds.spanMs;
    out.push({
      frac,
      label: new Date(ms).toISOString().slice(11, 19), // HH:MM:SS UTC
    });
  }
  return out;
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      {message}
    </div>
  );
}
