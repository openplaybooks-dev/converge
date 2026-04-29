"use client";

import Link from "next/link";
import { useState } from "react";
import { PlaybookGraph } from "@/components/designer/playbook-graph";
import { ArtifactsPanel, TasksPanel } from "@/components/designer/sidebar";
import { Inspector, type TaskShape } from "@/components/designer/inspector";

function inspectorKey(task: TaskShape | undefined): string {
  if (!task) return "none";
  return [
    task.id,
    task.title ?? "",
    task.description ?? "",
    task.inputs.join("|"),
    task.outputs.join("|"),
    task.dependencies.join("|"),
    task.tags.join("|"),
    task.blocking ? "1" : "0",
  ].join("");
}

interface ArtifactShape {
  glob: string;
  producedBy: string[];
  consumedBy: string[];
}

interface Props {
  playbookName: string;
  description?: string;
  templateDir: string;
  tasks: TaskShape[];
  artifacts: ArtifactShape[];
  dataFlow: { from: string; to: string; via: string }[];
}

type ViewMode = "graph" | "tree" | "gantt";

export function DesignerShell({
  playbookName,
  description,
  templateDir,
  tasks,
  artifacts,
  dataFlow,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("graph");

  const selected = tasks.find((t) => t.id === selectedId);

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-6 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
            Playbook
          </div>
          <h1 className="truncate text-lg font-semibold">{playbookName}</h1>
          {description ? (
            <p className="truncate text-xs text-[var(--color-muted-foreground)]">
              {description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <ViewSwitcher current={view} onChange={setView} />
          <Link
            href="/"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs hover:bg-[var(--color-muted)]"
          >
            All playbooks
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-[var(--color-border)]">
          <TasksPanel
            tasks={tasks}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <ArtifactsPanel artifacts={artifacts} />
          <footer className="border-t border-[var(--color-border)] px-4 py-2 text-[10px] font-mono text-[var(--color-muted-foreground)]">
            {templateDir}
          </footer>
        </aside>

        <main className="relative flex-1">
          {view === "graph" ? (
            <PlaybookGraph
              playbookName={playbookName}
              tasks={tasks}
              dataFlow={dataFlow}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <ComingSoon mode={view} />
          )}
        </main>

        <Inspector
          key={inspectorKey(selected)}
          task={selected}
          playbookName={playbookName}
          taskIds={tasks.map((t) => t.id)}
        />
      </div>
    </div>
  );
}

function ViewSwitcher({
  current,
  onChange,
}: {
  current: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const items: { id: ViewMode; label: string }[] = [
    { id: "graph", label: "Graph" },
    { id: "tree", label: "Tree" },
    { id: "gantt", label: "Gantt" },
  ];
  return (
    <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5 text-xs">
      {items.map((it) => {
        const active = it.id === current;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={
              active
                ? "rounded-[4px] bg-[var(--color-primary)] px-3 py-1 text-[var(--color-primary-foreground)]"
                : "rounded-[4px] px-3 py-1 hover:bg-[var(--color-muted)]"
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function ComingSoon({ mode }: { mode: ViewMode }) {
  return (
    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      <div className="rounded-lg border border-dashed border-[var(--color-border)] px-6 py-4 text-center">
        <div className="font-medium capitalize">{mode} view</div>
        <div className="mt-1 text-xs">Not built yet — see proposal §12.6.</div>
      </div>
    </div>
  );
}
