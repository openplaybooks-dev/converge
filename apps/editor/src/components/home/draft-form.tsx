"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

function deriveSlug(prompt: string): string {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export function DraftForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [slugOverride, setSlugOverride] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  const promptId = useId();
  const slugId = useId();

  const derivedSlug = deriveSlug(prompt);
  const effectiveSlug = slugTouched ? slugOverride : derivedSlug;
  const slugValid = !effectiveSlug || SLUG_RE.test(effectiveSlug);
  const promptValid = prompt.trim().length >= 8;
  const canSubmit = promptValid && slugValid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    const toastId = toast.loading("Drafting playbook…", {
      description: "Asking Claude to plan tasks and dependencies.",
    });
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          slug: effectiveSlug || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data && (data.message as string)) || `HTTP ${res.status}`,
        );
      }
      toast.success(`Drafted ${data.name}`, {
        id: toastId,
        description: `${data.taskCount} tasks · opening designer…`,
      });
      router.push(`/playbooks/${encodeURIComponent(data.name)}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("Draft failed", { id: toastId, description: msg });
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm"
      aria-labelledby="draft-heading"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 id="draft-heading" className="text-base font-semibold">
            Draft a playbook with AI
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
            Describe the goal in one line. Claude proposes a playbook with
            tasks, inputs, outputs, and checks. You edit before running.
          </p>
        </div>
        <span className="hidden font-mono text-[10px] text-[var(--color-muted-foreground)] sm:block">
          POST /api/ai/draft
        </span>
      </header>

      <div className="flex flex-col gap-3">
        <div>
          <label htmlFor={promptId} className="sr-only">
            Goal
          </label>
          <Textarea
            id={promptId}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (!slugTouched) setSlugOverride("");
            }}
            placeholder="Ship a TypeScript CLI that scrapes a JSON-LD product feed and writes a CSV…"
            rows={3}
            disabled={busy}
            aria-describedby={`${promptId}-help`}
          />
          <p
            id={`${promptId}-help`}
            className="mt-1 text-[10px] text-[var(--color-muted-foreground)]"
          >
            8–2000 characters. Be specific about deliverables and constraints.
          </p>
        </div>

        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label
              htmlFor={slugId}
              className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
            >
              Slug
            </label>
            <Input
              id={slugId}
              value={effectiveSlug}
              placeholder="my-new-playbook"
              disabled={busy}
              onChange={(e) => {
                setSlugTouched(true);
                setSlugOverride(e.target.value);
              }}
              aria-invalid={!slugValid}
              aria-describedby={`${slugId}-help`}
              className="font-mono text-[12px]"
            />
            <p
              id={`${slugId}-help`}
              className={
                "mt-1 text-[10px] " +
                (slugValid
                  ? "text-[var(--color-muted-foreground)]"
                  : "text-[var(--color-danger)]")
              }
            >
              {slugValid
                ? `Will write to .converge/playbooks/${effectiveSlug || "<slug>"}`
                : "Slug must be lowercase letters, digits, and hyphens"}
            </p>
          </div>

          <Button onClick={submit} disabled={!canSubmit} size="default">
            {busy ? "Drafting…" : "Draft playbook"}
          </Button>
        </div>
      </div>
    </section>
  );
}
