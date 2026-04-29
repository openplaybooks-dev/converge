"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  monospace?: boolean;
  suggestions?: string[];
}

export function TagInput({
  values,
  onChange,
  placeholder,
  monospace = true,
  suggestions,
}: Props) {
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    if (v.length === 0) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft.length === 0 && values.length > 0) {
      e.preventDefault();
      onChange(values.slice(0, -1));
    }
  }

  const reactId = useId();
  const listId = suggestions ? `tag-suggest-${reactId}` : undefined;

  return (
    <div>
      {values.length > 0 ? (
        <ul className="mb-1 flex flex-wrap gap-1">
          {values.map((v, i) => (
            <li
              key={`${v}-${i}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] px-1.5 py-0.5 text-[11px]",
                monospace && "font-mono",
              )}
            >
              <span className="max-w-[180px] truncate" title={v}>
                {v}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <Input
        value={draft}
        placeholder={placeholder ?? "Add and press Enter"}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        list={listId}
        className={monospace ? "font-mono text-[12px]" : "text-[12px]"}
      />
      {suggestions && suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
