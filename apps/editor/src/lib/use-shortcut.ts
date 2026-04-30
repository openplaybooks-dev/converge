"use client";

import { useEffect } from "react";

interface ShortcutDef {
  /** Lowercased key, e.g. "s", "z", "/" */
  key: string;
  /** Require Cmd (mac) or Ctrl (windows/linux) — auto-mapped */
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  /** Active only when the predicate returns true (e.g. dirty form) */
  enabled?: boolean;
  /** prevent default browser behaviour (e.g. Cmd+S → save dialog) */
  preventDefault?: boolean;
  handler: (e: KeyboardEvent) => void;
}

/**
 * Bind a single window-level keyboard shortcut. Cmd on macOS, Ctrl elsewhere.
 * Skips when the focus is in an editable surface unless the shortcut is meta.
 */
export function useShortcut(def: ShortcutDef): void {
  const {
    key,
    meta = false,
    shift = false,
    alt = false,
    enabled = true,
    preventDefault = true,
    handler,
  } = def;

  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const isMac =
        typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
      const metaMatches = meta ? (isMac ? e.metaKey : e.ctrlKey) : !e.metaKey && !e.ctrlKey;
      if (!metaMatches) return;
      if (e.shiftKey !== shift) return;
      if (e.altKey !== alt) return;
      if (e.key.toLowerCase() !== key.toLowerCase()) return;

      // For non-meta shortcuts, don't hijack typing.
      if (!meta) {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        if ((e.target as HTMLElement | null)?.isContentEditable) return;
      }

      if (preventDefault) e.preventDefault();
      handler(e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key, meta, shift, alt, enabled, preventDefault, handler]);
}
