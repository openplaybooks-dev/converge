import { useState, useEffect, useCallback, useRef } from "react";
import type { RunState, JournalEvent } from "../types";

export function usePlaybookStream(playbookName: string | null) {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!playbookName) return;

    const source = new EventSource(
      `/api/playbooks/${encodeURIComponent(playbookName)}/stream`,
    );
    sourceRef.current = source;

    source.addEventListener("runstate", (e: MessageEvent) => {
      try {
        setRunState(JSON.parse(e.data));
      } catch {}
    });

    source.addEventListener("journal", (e: MessageEvent) => {
      try {
        const ev = JSON.parse(e.data) as JournalEvent;
        setEvents((prev) => [...prev, ev]);
      } catch {}
    });

    source.addEventListener("inventory", () => {
      // Inventory changed — consumers can re-fetch if needed
    });

    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    return () => {
      source.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [playbookName]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { runState, events, connected, clearEvents };
}
