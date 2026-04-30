import Link from "next/link";
import { listPlaybooks } from "@/lib/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DraftForm } from "@/components/home/draft-form";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { root, sources } = await listPlaybooks();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-widest text-[var(--color-muted-foreground)]">
          Converge Editor · POC
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Playbooks</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Discovered from <code className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 text-xs">{root}</code>
        </p>
      </header>

      <DraftForm />

      {sources.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No playbooks found</CardTitle>
            <CardDescription>
              Add a playbook under{" "}
              <code className="rounded bg-[var(--color-muted)] px-1 text-xs">
                .converge/playbooks/&lt;name&gt;
              </code>{" "}
              or set <code>CONVERGE_ROOT</code> to a project that has them.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sources.map((src) => {
            const taskCount = src.def.tasks?.length ?? 0;
            const mode = src.def.run?.mode ?? "oneoff";
            return (
              <li key={`${src.builtin ? "builtin" : "project"}:${src.def.name}`}>
                <Link
                  href={`/playbooks/${encodeURIComponent(src.def.name)}`}
                  className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                  <Card className="h-full transition-colors hover:border-[var(--color-primary)]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle className="truncate">{src.def.name}</CardTitle>
                        <Badge tone={src.builtin ? "muted" : "primary"}>
                          {src.builtin ? "builtin" : "project"}
                        </Badge>
                      </div>
                      {src.def.description ? (
                        <CardDescription className="line-clamp-2">
                          {src.def.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-[var(--color-muted-foreground)]">
                            Tasks
                          </dt>
                          <dd className="font-mono">{taskCount}</dd>
                        </div>
                        <div>
                          <dt className="text-[var(--color-muted-foreground)]">
                            Mode
                          </dt>
                          <dd className="font-mono">{mode}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
