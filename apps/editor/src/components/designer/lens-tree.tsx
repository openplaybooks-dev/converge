"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { topoLevels } from "@/lib/lens-data";
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

export function LensTree({ tasks, statuses, selectedId, onSelect }: Props) {
  const grouped = useMemo(() => {
    const levels = topoLevels(tasks);
    const buckets = new Map<number, TaskShape[]>();
    for (const t of tasks) {
      const lvl = levels.get(t.id) ?? 0;
      const arr = buckets.get(lvl) ?? [];
      arr.push(t);
      buckets.set(lvl, arr);
    }
    for (const arr of buckets.values()) {
      arr.sort((a, b) => a.id.localeCompare(b.id));
    }
    return Array.from(buckets.entries()).sort((a, b) => a[0] - b[0]);
  }, [tasks]);

  if (tasks.length === 0) {
    return <Empty message="No tasks to render." />;
  }

  return (
    <div className="h-full overflow-auto px-6 py-6">
      <ol className="mx-auto flex max-w-3xl flex-col gap-6">
        {grouped.map(([level, items]) => (
          <li key={level}>
            <header className="mb-2 flex items-baseline gap-2">
              <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted-foreground)]">
                Level {level}
              </span>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                {items.length} task{items.length === 1 ? "" : "s"}
              </span>
            </header>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((t) => {
                const status = statuses[t.id]?.state ?? "pending";
                const presented = presentStatus(status);
                const active = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(active ? undefined : t.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-md border bg-[var(--color-card)] px-3 py-2 text-left transition-colors hover:border-[var(--color-primary)]",
                        active
                          ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/30"
                          : "border-[var(--color-border)]",
                      )}
                      style={{
                        background:
                          status !== "pending"
                            ? `linear-gradient(0deg, ${presented.tint}, ${presented.tint}), var(--color-card)`
                            : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: presented.color }}
                          aria-label={presented.label}
                        />
                        <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                          {t.id}
                        </span>
                        {t.blocking ? (
                          <span className="ml-auto rounded-full bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                            block
                          </span>
                        ) : null}
                      </div>
                      <span className="truncate text-sm">
                        {t.title ?? t.id}
                      </span>
                      {t.dependencies.length > 0 ? (
                        <span className="truncate text-[10px] text-[var(--color-muted-foreground)]">
                          ← {t.dependencies.join(", ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      {message}
    </div>
  );
}
