"use client";

import { useEffect } from "react";

/**
 * Block the browser tab close / refresh / nav-away when `dirty` is true.
 * Modern browsers ignore the message string; the prompt itself is what matters.
 */
export function useDirtyGuard(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Some legacy browsers display this string.
      e.returnValue = "You have unsaved changes.";
      return "You have unsaved changes.";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);
}
