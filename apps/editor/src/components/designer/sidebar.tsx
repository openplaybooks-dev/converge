"use client";

import { cn } from "@/lib/utils";

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
  selectedId,
  onSelect,
}: {
  tasks: TaskShape[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden border-b border-[var(--color-border)]">
      <header className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Tasks
        </h3>
        <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
          {tasks.length}
        </span>
      </header>
      <ul className="flex-1 overflow-auto px-2 pb-3">
        {tasks.length === 0 ? (
          <li className="px-2 py-2 text-xs text-[var(--color-muted-foreground)]">
            No TASK.md files found under <code>tasks/</code>.
          </li>
        ) : (
          tasks.map((t) => {
            const active = t.id === selectedId;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(active ? undefined : t.id)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--color-muted)]",
                    active && "bg-[var(--color-accent)]",
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    <span className="truncate font-mono text-[11px] text-[var(--color-muted-foreground)]">
                      {t.id}
                    </span>
                    {t.blocking ? (
                      <span className="ml-auto rounded-full bg-[var(--color-warning)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                        block
                      </span>
                    ) : null}
                  </div>
                  <span className="truncate text-sm">{t.title ?? t.id}</span>
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
}: {
  artifacts: ArtifactShape[];
}) {
  return (
    <section className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Artifacts
        </h3>
        <span className="text-xs font-mono text-[var(--color-muted-foreground)]">
          {artifacts.length}
        </span>
      </header>
      <ul className="flex-1 overflow-auto px-2 pb-3">
        {artifacts.length === 0 ? (
          <li className="px-2 py-2 text-xs text-[var(--color-muted-foreground)]">
            No tasks declare <code>inputs</code> or <code>outputs</code> yet.
          </li>
        ) : (
          artifacts.map((a) => (
            <li
              key={a.glob}
              className="flex flex-col gap-0.5 rounded-md px-2 py-1.5"
            >
              <span className="truncate font-mono text-xs">{a.glob}</span>
              <span className="text-[10px] text-[var(--color-muted-foreground)]">
                {a.producedBy.length > 0 ? `out: ${a.producedBy.join(", ")}` : null}
                {a.producedBy.length > 0 && a.consumedBy.length > 0 ? " · " : ""}
                {a.consumedBy.length > 0 ? `in: ${a.consumedBy.join(", ")}` : null}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
