"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [error, setError] = useState<string | null>(null);

  const derivedSlug = deriveSlug(prompt);
  const effectiveSlug = slugTouched ? slugOverride : derivedSlug;
  const slugValid = !effectiveSlug || SLUG_RE.test(effectiveSlug);
  const canSubmit = prompt.trim().length >= 8 && slugValid && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
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
      router.push(`/playbooks/${encodeURIComponent(data.name)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Draft a playbook with AI</h2>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Describe the goal in one line. AI proposes a playbook + tasks; you
            edit before running.
          </p>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-muted-foreground)]">
          POST /api/ai/draft
        </span>
      </header>

      <div className="flex flex-col gap-3">
        <Textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            if (!slugTouched) setSlugOverride("");
          }}
          placeholder="Ship a TypeScript CLI that scrapes a JSON-LD product feed and writes a CSV…"
          rows={3}
          disabled={busy}
        />

        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
          <div>
            <label
              className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
              htmlFor="draft-slug"
            >
              Slug
            </label>
            <Input
              id="draft-slug"
              value={effectiveSlug}
              placeholder="my-new-playbook"
              disabled={busy}
              onChange={(e) => {
                setSlugTouched(true);
                setSlugOverride(e.target.value);
              }}
              className="font-mono text-[12px]"
            />
            <p
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

          <Button onClick={submit} disabled={!canSubmit}>
            {busy ? "Drafting…" : "Draft playbook"}
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
            {error}
          </div>
        ) : null}
      </div>
    </section>
  );
}
