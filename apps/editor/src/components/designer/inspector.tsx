"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/designer/tag-input";
import { useShortcut } from "@/lib/use-shortcut";
import { useDirtyGuard } from "@/lib/use-dirty-guard";
import { cn } from "@/lib/utils";

export interface TaskShape {
  id: string;
  title?: string;
  description?: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  tags: string[];
  blocking?: boolean;
  checks: { id: string; cmd?: string; description?: string }[];
  filePath: string;
  body: string;
}

interface Draft {
  title: string;
  description: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  tags: string[];
  blocking: boolean;
  body: string;
}

function toDraft(t: TaskShape): Draft {
  return {
    title: t.title ?? "",
    description: t.description ?? "",
    inputs: [...t.inputs],
    outputs: [...t.outputs],
    dependencies: [...t.dependencies],
    tags: [...t.tags],
    blocking: t.blocking ?? false,
    body: t.body ?? "",
  };
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function isDirty(draft: Draft, original: TaskShape): boolean {
  return (
    draft.title !== (original.title ?? "") ||
    draft.description !== (original.description ?? "") ||
    !arraysEqual(draft.inputs, original.inputs) ||
    !arraysEqual(draft.outputs, original.outputs) ||
    !arraysEqual(draft.dependencies, original.dependencies) ||
    !arraysEqual(draft.tags, original.tags) ||
    draft.blocking !== (original.blocking ?? false) ||
    draft.body !== (original.body ?? "")
  );
}

interface Props {
  task?: TaskShape;
  playbookName: string;
  taskIds: string[];
  /** Lets parent close the inspector overlay on small screens */
  onClose?: () => void;
}

export function Inspector({ task, playbookName, taskIds, onClose }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(
    task ? toDraft(task) : null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bodyExpanded, setBodyExpanded] = useState(false);

  const titleId = useId();
  const descId = useId();
  const blockingId = useId();
  const bodyId = useId();

  const dirty = task && draft ? isDirty(draft, task) : false;

  useDirtyGuard(dirty);

  useShortcut({
    key: "s",
    meta: true,
    enabled: dirty && !saving && !!task,
    handler: () => save(),
  });

  if (!task || !draft) {
    return (
      <aside
        className="hidden w-[360px] shrink-0 flex-col items-center justify-center border-l border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)] xl:flex"
        aria-label="Task inspector — empty"
      >
        <div className="text-center">
          <p className="text-sm">No task selected</p>
          <p className="mt-1 text-xs">
            Click a task in any view to inspect and edit it.
          </p>
        </div>
      </aside>
    );
  }

  const depSuggestions = taskIds.filter((id) => id !== task.id);

  async function save() {
    if (!draft || !task) return;
    setSaving(true);
    setError(null);
    const toastId = toast.loading(`Saving ${task.id}…`);
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: draft.title,
            description: draft.description,
            inputs: draft.inputs,
            outputs: draft.outputs,
            dependencies: draft.dependencies,
            tags: draft.tags,
            blocking: draft.blocking ? true : null,
            body: draft.body,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      toast.success(`Saved ${task.id}`, { id: toastId });
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(`Save failed`, { id: toastId, description: msg });
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (!task) return;
    setDraft(toDraft(task));
    setError(null);
  }

  return (
    <aside
      className="flex w-full shrink-0 flex-col overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-card)] xl:w-[380px]"
      aria-label={`Inspector for ${task.id}`}
    >
      <header className="flex items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-muted-foreground)]">
              {task.id}
            </span>
            {dirty ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-warning)]">
                Modified
              </span>
            ) : null}
          </div>
          <h2 className="mt-1 truncate text-base font-semibold leading-tight">
            {draft.title || task.id}
          </h2>
          <div
            className="mt-0.5 truncate font-mono text-[10px] text-[var(--color-muted-foreground)]"
            title={task.filePath}
          >
            {task.filePath}
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector"
            className="-mr-1 rounded-md p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] xl:hidden"
          >
            ×
          </button>
        ) : null}
      </header>

      <div className="flex-1 space-y-5 overflow-auto px-5 py-4 text-sm">
        <Field label="Title" htmlFor={titleId}>
          <Input
            id={titleId}
            value={draft.title}
            disabled={saving}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>

        <Field label="Description" htmlFor={descId}>
          <Textarea
            id={descId}
            value={draft.description}
            disabled={saving}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
            rows={3}
          />
        </Field>

        <Field label="Dependencies">
          <TagInput
            values={draft.dependencies}
            onChange={(v) => setDraft({ ...draft, dependencies: v })}
            placeholder="task-id or tag:foo"
            suggestions={depSuggestions}
          />
        </Field>

        <Field label="Inputs">
          <TagInput
            values={draft.inputs}
            onChange={(v) => setDraft({ ...draft, inputs: v })}
            placeholder="src/**/*.ts"
          />
        </Field>

        <Field label="Outputs">
          <TagInput
            values={draft.outputs}
            onChange={(v) => setDraft({ ...draft, outputs: v })}
            placeholder=".converge/artifacts/foo.md"
          />
        </Field>

        <Field label="Tags">
          <TagInput
            values={draft.tags}
            onChange={(v) => setDraft({ ...draft, tags: v })}
            placeholder="design, milestone:v1"
            monospace={false}
          />
        </Field>

        <div>
          <label
            className="flex items-center gap-2 text-sm"
            htmlFor={blockingId}
          >
            <input
              id={blockingId}
              type="checkbox"
              checked={draft.blocking}
              disabled={saving}
              onChange={(e) =>
                setDraft({ ...draft, blocking: e.target.checked })
              }
              className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
            />
            <span className="font-medium">Blocking</span>
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Block dependents on failure
            </span>
          </label>
        </div>

        <Field
          label={
            <span className="flex items-center gap-2">
              <span>Body</span>
              <span className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
                markdown · agent brief
              </span>
            </span>
          }
          htmlFor={bodyId}
        >
          <Textarea
            id={bodyId}
            value={draft.body}
            disabled={saving}
            spellCheck={false}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            onFocus={() => setBodyExpanded(true)}
            onBlur={() => setBodyExpanded(false)}
            rows={bodyExpanded ? 16 : 6}
            className={cn(
              "font-mono text-[12px] leading-relaxed transition-[min-height] duration-150",
            )}
          />
        </Field>

        {task.checks.length > 0 ? (
          <Field label={`Checks (${task.checks.length})`}>
            <ul className="flex flex-col gap-1.5">
              {task.checks.map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-2 py-1.5"
                >
                  <div className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
                    {c.id}
                  </div>
                  {c.description ? (
                    <div className="mt-0.5 text-[12px]">{c.description}</div>
                  ) : null}
                  {c.cmd ? (
                    <pre className="mt-1 overflow-x-auto rounded bg-[var(--color-card)] px-1.5 py-1 text-[10px] leading-tight">
                      {c.cmd}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              Checks are not yet editable in the inspector.
            </p>
          </Field>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-[var(--color-border)] bg-[var(--color-card-elevated)] px-5 py-3">
        <span
          className="text-[11px] text-[var(--color-muted-foreground)]"
          aria-live="polite"
        >
          {error ? (
            <span className="text-[var(--color-danger)]">{error}</span>
          ) : dirty ? (
            <>
              Unsaved changes ·{" "}
              <kbd className="rounded border border-[var(--color-border)] px-1 py-0.5 font-mono text-[10px]">
                ⌘S
              </kbd>{" "}
              to save
            </>
          ) : (
            "All changes saved"
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!dirty || saving}
            onClick={reset}
          >
            Reset
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </footer>
    </aside>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
