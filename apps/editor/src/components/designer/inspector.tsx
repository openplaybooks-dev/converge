"use client";

interface TaskShape {
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

export function Inspector({ task }: { task?: TaskShape }) {
  if (!task) {
    return (
      <aside className="flex w-[320px] shrink-0 items-center justify-center border-l border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]">
        Select a task to inspect.
      </aside>
    );
  }

  return (
    <aside className="flex w-[360px] shrink-0 flex-col overflow-hidden border-l border-[var(--color-border)]">
      <header className="flex flex-col gap-1 border-b border-[var(--color-border)] px-5 py-4">
        <div className="font-mono text-[11px] text-[var(--color-muted-foreground)]">
          {task.id}
        </div>
        <h2 className="text-base font-semibold leading-tight">
          {task.title ?? task.id}
        </h2>
        <div className="font-mono text-[10px] text-[var(--color-muted-foreground)]">
          {task.filePath}
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-auto px-5 py-4 text-sm">
        {task.description ? (
          <p className="text-[var(--color-muted-foreground)]">
            {task.description}
          </p>
        ) : null}

        <Field label="Dependencies">
          {task.dependencies.length === 0 ? (
            <Empty />
          ) : (
            <ul className="flex flex-wrap gap-1">
              {task.dependencies.map((d) => (
                <li
                  key={d}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px]"
                >
                  {d}
                </li>
              ))}
            </ul>
          )}
        </Field>

        <Field label="Inputs">
          <GlobList values={task.inputs} />
        </Field>

        <Field label="Outputs">
          <GlobList values={task.outputs} />
        </Field>

        {task.tags.length > 0 ? (
          <Field label="Tags">
            <ul className="flex flex-wrap gap-1">
              {task.tags.map((t) => (
                <li
                  key={t}
                  className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px]"
                >
                  {t}
                </li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Field label={`Checks (${task.checks.length})`}>
          {task.checks.length === 0 ? (
            <Empty />
          ) : (
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
          )}
        </Field>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function GlobList({ values }: { values: string[] }) {
  if (values.length === 0) return <Empty />;
  return (
    <ul className="flex flex-col gap-0.5">
      {values.map((v) => (
        <li
          key={v}
          className="truncate rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px]"
        >
          {v}
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <span className="text-[var(--color-muted-foreground)]/60">—</span>;
}
