"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { presentStatus, type RunState } from "@/lib/status-style";
import { Input } from "@/components/ui/input";

interface TaskShape {
  id: string;
  title?: string;
  blocking?: boolean;
  filePath: string;
}

interface ArtifactShape {
  glob: string;
  producedBy: string[];
  consumedBy: string[];
}

export function TasksPanel({
  tasks,
  statuses,
  selectedId,
  onSelect,
}: {
  tasks: TaskShape[];
  statuses: Record<string, { state: RunState } | null>;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const [filter, setFilter] = useState("");
  const filterId = useId();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        (t.title ?? "").toLowerCase().includes(q),
    );
  }, [tasks, filter]);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-[var(--color-border)]"
      aria-labelledby={`${filterId}-heading`}
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h3
          id={`${filterId}-heading`}
          className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
        >
          Tasks
        </h3>
        <span
          className="font-mono text-[11px] text-[var(--color-muted-foreground)]"
          aria-label={`${filtered.length} of ${tasks.length} tasks`}
        >
          {filtered.length === tasks.length
            ? tasks.length
            : `${filtered.length}/${tasks.length}`}
        </span>
      </header>

      {tasks.length > 4 ? (
        <div className="px-3 pb-2">
          <Input
            id={filterId}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tasks…"
            aria-label="Filter tasks"
            className="h-7 text-[12px]"
          />
        </div>
      ) : null}

      <ul className="flex-1 overflow-auto px-2 pb-3" role="listbox">
        {filtered.length === 0 ? (
          <li className="px-2 py-3 text-xs text-[var(--color-muted-foreground)]">
            {tasks.length === 0
              ? "No tasks yet."
              : `No tasks match “${filter}”.`}
          </li>
        ) : (
          filtered.map((t) => {
            const active = t.id === selectedId;
            const status = statuses[t.id]?.state ?? "pending";
            const presented = presentStatus(status);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(active ? undefined : t.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    active
                      ? "bg-[var(--color-accent)]"
                      : "hover:bg-[var(--color-muted)]",
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: presented.color }}
                      title={presented.label}
                      aria-label={presented.label}
                    />
                    <span className="truncate font-mono text-[11px] text-[var(--color-muted-foreground)]">
                      {t.id}
                    </span>
                    {t.blocking ? (
                      <span className="ml-auto rounded-full bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                        block
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate text-[13px]">
                    {t.title ?? t.id}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

export function ArtifactsPanel({
  artifacts,
  onSelect,
}: {
  artifacts: ArtifactShape[];
  onSelect?: (taskId: string) => void;
}) {
  return (
    <section
      className="flex min-h-0 flex-[0_0_40%] flex-col overflow-hidden"
      aria-label="Artifacts"
    >
      <header className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Artifacts
        </h3>
        <span className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
          {artifacts.length}
        </span>
      </header>
      <ul className="flex-1 overflow-auto px-2 pb-3">
        {artifacts.length === 0 ? (
          <li className="px-2 py-3 text-xs text-[var(--color-muted-foreground)]">
            No tasks declare <code>inputs</code> or <code>outputs</code> yet.
          </li>
        ) : (
          artifacts.map((a) => (
            <li
              key={a.glob}
              className="rounded-md px-2 py-1.5 hover:bg-[var(--color-muted)]/50"
            >
              <div className="truncate font-mono text-[11px]" title={a.glob}>
                {a.glob}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-[var(--color-muted-foreground)]">
                {a.producedBy.map((id) => (
                  <button
                    key={`out-${id}`}
                    type="button"
                    onClick={() => onSelect?.(id)}
                    className="rounded bg-[var(--color-success)]/10 px-1.5 py-0.5 font-mono text-[var(--color-success)] hover:underline"
                  >
                    out: {id}
                  </button>
                ))}
                {a.consumedBy.map((id) => (
                  <button
                    key={`in-${id}`}
                    type="button"
                    onClick={() => onSelect?.(id)}
                    className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 font-mono text-[var(--color-primary)] hover:underline"
                  >
                    in: {id}
                  </button>
                ))}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
