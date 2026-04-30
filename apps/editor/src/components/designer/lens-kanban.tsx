"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { groupByStatus } from "@/lib/lens-data";
import { presentStatus, type RunState } from "@/lib/status-style";

interface TaskShape {
  id: string;
  title?: string;
  blocking?: boolean;
  dependencies: string[];
}

interface Props {
  tasks: TaskShape[];
  statuses: Record<string, { state: RunState } | null>;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

const COLUMN_ORDER: RunState[] = [
  "pending",
  "running",
  "complete",
  "failed",
  "skipped",
];

export function LensKanban({
  tasks,
  statuses,
  selectedId,
  onSelect,
}: Props) {
  const buckets = useMemo(
    () => groupByStatus(tasks, statuses),
    [tasks, statuses],
  );

  return (
    <div className="h-full overflow-auto px-6 py-4">
      <div
        className="grid h-full gap-3"
        style={{
          gridTemplateColumns: `repeat(${COLUMN_ORDER.length}, minmax(220px, 1fr))`,
        }}
      >
        {COLUMN_ORDER.map((state) => {
          const items = buckets[state];
          const presented = presentStatus(state);
          return (
            <section
              key={state}
              className="flex h-full min-w-0 flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40"
            >
              <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      state === "running" && "animate-pulse",
                    )}
                    style={{ background: presented.color }}
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-widest">
                    {presented.label}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                  {items.length}
                </span>
              </header>
              <ul className="flex-1 space-y-2 overflow-auto p-2">
                {items.length === 0 ? (
                  <li className="px-1 py-2 text-[11px] text-[var(--color-muted-foreground)]/60">
                    —
                  </li>
                ) : (
                  items.map((t) => {
                    const active = t.id === selectedId;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect(active ? undefined : t.id)
                          }
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-md border bg-[var(--color-card)] px-2 py-1.5 text-left text-xs transition-colors hover:border-[var(--color-primary)]",
                            active
                              ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
                              : "border-[var(--color-border)]",
                          )}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
                              {t.id}
                            </span>
                            {t.blocking ? (
                              <span className="rounded-full bg-[var(--color-warning)]/15 px-1 py-0.5 text-[9px] font-medium text-[var(--color-warning)]">
                                block
                              </span>
                            ) : null}
                          </div>
                          <span className="truncate text-[12px]">
                            {t.title ?? t.id}
                          </span>
                          {t.dependencies.length > 0 ? (
                            <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                              ← {t.dependencies.length} dep
                              {t.dependencies.length === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
