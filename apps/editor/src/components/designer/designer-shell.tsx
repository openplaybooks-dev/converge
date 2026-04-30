"use client";

import Link from "next/link";
import { useState } from "react";
import { PlaybookGraph } from "@/components/designer/playbook-graph";
import { LensTree } from "@/components/designer/lens-tree";
import { LensGantt } from "@/components/designer/lens-gantt";
import { LensKanban } from "@/components/designer/lens-kanban";
import { ArtifactsPanel, TasksPanel } from "@/components/designer/sidebar";
import { Inspector, type TaskShape } from "@/components/designer/inspector";
import { useLiveStatuses, type StatusMap } from "@/lib/use-live-statuses";
import { cn } from "@/lib/utils";

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
    task.body ?? "",
  ].join("");
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
  statuses: StatusMap;
}

type ViewMode = "graph" | "tree" | "gantt" | "kanban";

const VIEW_LABELS: Record<ViewMode, string> = {
  graph: "Graph",
  tree: "Tree",
  gantt: "Gantt",
  kanban: "Kanban",
};

export function DesignerShell({
  playbookName,
  description,
  templateDir,
  tasks,
  artifacts,
  dataFlow,
  statuses,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("graph");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const { statuses: liveStatuses, connection } = useLiveStatuses(
    playbookName,
    statuses,
  );

  const selected = tasks.find((t) => t.id === selectedId);

  function handleSelect(id: string | undefined) {
    setSelectedId(id);
    if (id) setInspectorOpen(true);
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--color-background)]">
      <Header
        playbookName={playbookName}
        description={description}
        connection={connection}
        view={view}
        onViewChange={setView}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left rail: tasks + artifacts. Hidden on mobile when toggled. */}
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-[width,opacity] duration-150",
            sidebarOpen ? "w-[280px] opacity-100" : "w-0 overflow-hidden opacity-0",
          )}
          aria-label="Tasks and artifacts"
          aria-hidden={!sidebarOpen}
        >
          <TasksPanel
            tasks={tasks}
            statuses={liveStatuses}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <ArtifactsPanel
            artifacts={artifacts}
            onSelect={(taskId) => handleSelect(taskId)}
          />
          <footer
            className="border-t border-[var(--color-border)] px-4 py-2"
            title={templateDir}
          >
            <div className="truncate font-mono text-[10px] text-[var(--color-muted-foreground)]">
              {templateDir}
            </div>
          </footer>
        </aside>

        <main className="relative min-w-0 flex-1">
          {view === "graph" ? (
            <PlaybookGraph
              playbookName={playbookName}
              tasks={tasks}
              dataFlow={dataFlow}
              statuses={liveStatuses}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ) : view === "tree" ? (
            <LensTree
              tasks={tasks}
              statuses={liveStatuses}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ) : view === "gantt" ? (
            <LensGantt
              tasks={tasks}
              statuses={liveStatuses}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          ) : (
            <LensKanban
              tasks={tasks}
              statuses={liveStatuses}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          )}
        </main>

        {/*
          Inspector. On xl: always visible as a fixed right pane.
          Below xl: a slide-over overlay so the canvas keeps full width.
        */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-30 transform transition-transform duration-200 xl:static xl:translate-x-0",
            inspectorOpen || !selected
              ? "translate-x-0"
              : "translate-x-full xl:translate-x-0",
            !selected && "xl:flex hidden",
          )}
        >
          {selected && inspectorOpen ? (
            <button
              type="button"
              aria-label="Close inspector overlay"
              className="fixed inset-0 -z-10 bg-[color-mix(in_oklch,black_30%,transparent)] xl:hidden"
              onClick={() => setInspectorOpen(false)}
            />
          ) : null}
          <Inspector
            key={inspectorKey(selected)}
            task={selected}
            playbookName={playbookName}
            taskIds={tasks.map((t) => t.id)}
            onClose={() => setInspectorOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  playbookName: string;
  description?: string;
  connection: { phase: "connecting" | "open" | "error" };
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function Header({
  playbookName,
  description,
  connection,
  view,
  onViewChange,
  sidebarOpen,
  onToggleSidebar,
}: HeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-card-elevated)] px-4 py-2.5">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        aria-pressed={sidebarOpen}
        className="rounded-md p-1.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="3"
            width="12"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <line x1="6" y1="3" x2="6" y2="13" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>

      <Link
        href="/"
        className="flex items-center gap-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
        aria-label="All playbooks"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="2.2" fill="var(--color-primary)" />
          <circle cx="14" cy="6" r="2.2" fill="var(--color-success)" />
          <circle cx="14" cy="14" r="2.2" fill="var(--color-warning)" />
          <line
            x1="6"
            y1="6"
            x2="14"
            y2="6"
            stroke="var(--color-muted-foreground)"
            strokeWidth="1.2"
          />
          <line
            x1="14"
            y1="6"
            x2="14"
            y2="14"
            stroke="var(--color-muted-foreground)"
            strokeWidth="1.2"
          />
        </svg>
        <span className="text-sm font-semibold">Converge</span>
      </Link>

      <div
        className="hidden h-5 w-px bg-[var(--color-border)] sm:block"
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="truncate text-xs text-[var(--color-muted-foreground)] hover:underline"
          >
            Playbooks
          </Link>
          <span className="text-[var(--color-muted-foreground)]">/</span>
          <h1 className="truncate text-sm font-semibold">{playbookName}</h1>
        </div>
        {description ? (
          <p className="truncate text-[11px] text-[var(--color-muted-foreground)]">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <LiveBadge phase={connection.phase} />
        <ViewSwitcher current={view} onChange={onViewChange} />
      </div>
    </header>
  );
}

function LiveBadge({ phase }: { phase: "connecting" | "open" | "error" }) {
  const presentation = {
    connecting: { dot: "var(--color-muted-foreground)", label: "Connecting" },
    open: { dot: "var(--color-success)", label: "Live" },
    error: { dot: "var(--color-danger)", label: "Reconnecting" },
  } as const;
  const p = presentation[phase];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] text-[var(--color-muted-foreground)]"
      title={`Journal stream: ${p.label.toLowerCase()}`}
      role="status"
      aria-live="polite"
    >
      <span
        className={
          phase === "open"
            ? "h-1.5 w-1.5 animate-pulse rounded-full"
            : "h-1.5 w-1.5 rounded-full"
        }
        style={{ background: p.dot }}
        aria-hidden="true"
      />
      {p.label}
    </span>
  );
}

function ViewSwitcher({
  current,
  onChange,
}: {
  current: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const items = (Object.keys(VIEW_LABELS) as ViewMode[]).map((id) => ({
    id,
    label: VIEW_LABELS[id],
  }));
  return (
    <div
      className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-xs"
      role="radiogroup"
      aria-label="View mode"
    >
      {items.map((it) => {
        const active = it.id === current;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            role="radio"
            aria-checked={active}
            className={cn(
              "rounded-[5px] px-2.5 py-1 transition-colors",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
