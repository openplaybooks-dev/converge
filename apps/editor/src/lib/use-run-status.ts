"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface RunStatusView {
  running: boolean;
  startedAt?: string;
  exitedAt?: string;
  pid?: number;
  exitCode?: number | null;
  signal?: string | null;
  cliPath?: string;
  recentLogLines?: string[];
  stopping?: boolean;
}

const FAST_INTERVAL = 1500;
const SLOW_INTERVAL = 8_000;
const INITIAL: RunStatusView = { running: false };

/**
 * Poll /api/playbooks/<name>/run for the live process status. Polls fast
 * (1.5s) while a run is active or stopping, slow (8s) otherwise. Pauses
 * polling when the document is hidden so a backgrounded tab doesn't
 * hammer the server.
 */
export function useRunStatus(playbookName: string): {
  status: RunStatusView;
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<RunStatusView>(INITIAL);
  const aliveRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/run`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as RunStatusView;
      if (aliveRef.current) setStatus(data);
    } catch {
      // network blips — keep last known state
    }
  }, [playbookName]);

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule(delay: number) {
      if (!aliveRef.current) return;
      timer = setTimeout(async () => {
        if (!aliveRef.current) return;
        if (typeof document !== "undefined" && document.hidden) {
          // Don't waste cycles on hidden tabs; just reschedule.
          schedule(SLOW_INTERVAL);
          return;
        }
        await fetchOnce();
        if (!aliveRef.current) return;
        const isHot =
          status.running ||
          status.stopping ||
          (status.exitedAt && Date.now() - Date.parse(status.exitedAt) < 8_000);
        schedule(isHot ? FAST_INTERVAL : SLOW_INTERVAL);
      }, delay);
    }

    // Defer the first fetch by a tick so we don't call setState synchronously
    // inside the effect body (forbidden by react-hooks/set-state-in-effect).
    schedule(0);

    function onVisibility() {
      if (!document.hidden) void fetchOnce();
    }
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      aliveRef.current = false;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [fetchOnce, status.running, status.stopping, status.exitedAt]);

  return { status, refresh: fetchOnce };
}
