"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useRunStatus } from "@/lib/use-run-status";
import { cn } from "@/lib/utils";

interface Props {
  playbookName: string;
}

function formatUptime(startedAt: string, now: number): string {
  const ms = now - Date.parse(startedAt);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function RunButton({ playbookName }: Props) {
  const router = useRouter();
  const { status, refresh } = useRunStatus(playbookName);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while a run is active so the uptime advances.
  useEffect(() => {
    if (!status.running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status.running]);

  // When the run exits, refresh the page so the lens picks up final
  // status.json values without waiting for the next SSE tick.
  useEffect(() => {
    if (status.exitedAt) router.refresh();
  }, [status.exitedAt, router]);

  async function start() {
    setPending(true);
    const id = toast.loading(`Starting ${playbookName}…`);
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/run`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      toast.success(`Run started`, {
        id,
        description: `pid ${data.pid} · ${data.cliPath ?? "converge run"}`,
      });
      await refresh();
    } catch (err) {
      toast.error("Run failed to start", {
        id,
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPending(false);
    }
  }

  async function stop() {
    setPending(true);
    const id = toast.loading(`Stopping ${playbookName}…`);
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/stop`,
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      toast.success("Run stopped", {
        id,
        description:
          typeof data.exitCode === "number"
            ? `exit code ${data.exitCode}`
            : data.signal
              ? `signal ${data.signal}`
              : "terminated",
      });
      await refresh();
    } catch (err) {
      toast.error("Stop failed", {
        id,
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setPending(false);
    }
  }

  if (status.running || status.stopping) {
    const label = status.stopping ? "Stopping…" : "Stop";
    const uptime = status.startedAt ? formatUptime(status.startedAt, now) : "";
    return (
      <div
        className="inline-flex items-center gap-2"
        role="group"
        aria-label="Run controls"
      >
        <span
          className="hidden items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-[11px] font-mono text-[var(--color-muted-foreground)] sm:inline-flex"
          title={`pid ${status.pid}`}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]",
              status.running && !status.stopping && "animate-pulse",
            )}
            aria-hidden="true"
          />
          {status.stopping ? "stopping" : "running"}
          {uptime ? <span className="opacity-70">· {uptime}</span> : null}
        </span>
        <Button
          variant="danger"
          size="sm"
          onClick={stop}
          disabled={pending || status.stopping}
        >
          {label}
        </Button>
      </div>
    );
  }

  // Idle / exited
  const lastExitDescription = status.exitedAt
    ? typeof status.exitCode === "number"
      ? `last run · exit ${status.exitCode}`
      : status.signal
        ? `last run · signal ${status.signal}`
        : "last run · stopped"
    : null;

  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label="Run controls">
      {lastExitDescription ? (
        <span
          className="hidden text-[11px] text-[var(--color-muted-foreground)] sm:inline"
          title={status.exitedAt}
        >
          {lastExitDescription}
        </span>
      ) : null}
      <Button size="sm" onClick={start} disabled={pending} aria-label={`Run ${playbookName}`}>
        <RunIcon />
        Run
      </Button>
    </div>
  );
}

function RunIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
      <path d="M2 1.5l7 4-7 4z" fill="currentColor" />
    </svg>
  );
}
