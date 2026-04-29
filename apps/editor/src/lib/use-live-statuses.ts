"use client";

import { useEffect, useMemo, useState } from "react";
import type { RunState } from "@/lib/status-style";

export interface LiveStatus {
  state: RunState;
  attempt?: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export type StatusMap = Record<string, LiveStatus | null>;

interface ConnectionState {
  /** "connecting" until the first hello, then "open"; "error" if SSE failed. */
  phase: "connecting" | "open" | "error";
  lastMessageAt?: number;
}

/**
 * Subscribe to /api/playbooks/<name>/events and merge incremental status
 * updates over the server-rendered initial map. Server-rendered statuses
 * remain authoritative until the SSE stream pushes a fresh value for a task.
 */
export function useLiveStatuses(
  playbookName: string,
  initial: StatusMap,
): { statuses: StatusMap; connection: ConnectionState } {
  const [delta, setDelta] = useState<StatusMap>({});
  const [connection, setConnection] = useState<ConnectionState>({
    phase: "connecting",
  });

  useEffect(() => {
    const url = `/api/playbooks/${encodeURIComponent(playbookName)}/events`;
    const es = new EventSource(url);

    const onHello = () => {
      setConnection({ phase: "open", lastMessageAt: Date.now() });
    };

    const onStatus = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as { taskId: string } & LiveStatus;
        if (!data.taskId) return;
        setDelta((prev) => ({
          ...prev,
          [data.taskId]: {
            state: data.state,
            attempt: data.attempt,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            durationMs: data.durationMs,
            error: data.error,
          },
        }));
        setConnection({ phase: "open", lastMessageAt: Date.now() });
      } catch {
        // ignore malformed payloads
      }
    };

    const onCleared = (e: MessageEvent) => {
      try {
        const { taskId } = JSON.parse(e.data) as { taskId: string };
        if (!taskId) return;
        setDelta((prev) => ({ ...prev, [taskId]: null }));
      } catch {
        // ignore
      }
    };

    const onError = () => {
      setConnection({ phase: "error" });
      // EventSource auto-reconnects; we just surface the state.
    };

    es.addEventListener("hello", onHello);
    es.addEventListener("status", onStatus);
    es.addEventListener("status-cleared", onCleared);
    es.addEventListener("error", onError);

    return () => {
      es.removeEventListener("hello", onHello);
      es.removeEventListener("status", onStatus);
      es.removeEventListener("status-cleared", onCleared);
      es.removeEventListener("error", onError);
      es.close();
    };
  }, [playbookName]);

  const statuses = useMemo<StatusMap>(() => {
    if (Object.keys(delta).length === 0) return initial;
    return { ...initial, ...delta };
  }, [initial, delta]);

  return { statuses, connection };
}
