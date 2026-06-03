import { useState, useEffect, useRef } from "react";
import type { RunState, TaskNode } from "../types";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  SkipForward,
  Circle,
  GitBranch,
  GitMerge,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { navigate } from "../router";

const STATUS_ICON: Record<string, typeof Circle> = {
  pending: Clock,
  running: Loader2,
  pass: CheckCircle,
  error: XCircle,
  blocked: AlertTriangle,
  skipped: SkipForward,
  seeded: Circle,
};

const MODE_ICON: Record<string, typeof Circle> = {
  task: Circle,
  spawner: GitBranch,
  converger: GitMerge,
  gateway: ShieldCheck,
};

interface LogEntry {
  id: number;
  timestamp: string;
  stream: string;
  text: string;
}

interface RunStatus {
  status: string;
  playbook?: string;
  exitCode?: number;
  error?: string;
}

interface Props {
  playbookName: string;
  projectDir: string;
}

export function PlaybookRunView({ playbookName, projectDir }: Props) {
  const [runState, setRunState] = useState<RunState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus>({ status: "idle" });
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setRunStatus({ status: "starting", playbook: playbookName });

    const source = new EventSource(
      `/api/playbooks/${encodeURIComponent(playbookName)}/run`,
    );
    sourceRef.current = source;

    // Workaround: EventSource only supports GET. We need POST.
    // Instead, trigger the run via fetch and use the stream endpoint for events.
    source.close();

    // Use fetch with ReadableStream for POST SSE
    const abortController = new AbortController();
    fetch(`/api/playbooks/${encodeURIComponent(playbookName)}/run`, {
      method: "POST",
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          setRunStatus({ status: "error", error: `HTTP ${response.status}` });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                handleEvent(currentEvent, data);
              } catch {
                /* skip malformed data */
              }
              currentEvent = "";
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setRunStatus({ status: "error", error: err.message });
        }
      });

    return () => {
      abortController.abort();
    };
  }, [playbookName]);

  function handleEvent(event: string, data: any) {
    switch (event) {
      case "runstate":
        setRunState(data);
        break;
      case "log":
        setLogs((prev) => [
          ...prev,
          {
            id: ++logIdRef.current,
            timestamp: new Date().toISOString(),
            stream: data.stream,
            text: data.text,
          },
        ]);
        break;
      case "run-event":
        setLogs((prev) => [
          ...prev,
          {
            id: ++logIdRef.current,
            timestamp: new Date().toISOString(),
            stream: "event",
            text: `[${data.kind}] ${data.taskId || ""} ${data.message || ""}`.trim(),
          },
        ]);
        break;
      case "run-status":
        setRunStatus(data);
        break;
    }
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const tasks = runState?.nodes || [];
  const counts = {
    total: tasks.length,
    pass: tasks.filter((t) => t.status === "pass").length,
    running: tasks.filter((t) => t.status === "running").length,
    error: tasks.filter((t) => t.status === "error").length,
    pending: tasks.filter(
      (t) => t.status === "pending" || t.status === "blocked",
    ).length,
  };

  return (
    <div className="run-view">
      <header className="run-view__header">
        <button
          type="button"
          className="run-view__back"
          onClick={() => navigate({ kind: "home", view: "home" })}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="run-view__title-group">
          <h1 className="run-view__title">{playbookName}</h1>
          <span
            className={`run-view__badge run-view__badge--${runStatus.status}`}
          >
            {runStatus.status === "starting" && (
              <Loader2 size={12} className="run-view__spin" />
            )}
            {runStatus.status}
          </span>
        </div>
        <div className="run-view__counts">
          {counts.pass > 0 && (
            <span className="run-view__count run-view__count--pass">
              {counts.pass} passed
            </span>
          )}
          {counts.running > 0 && (
            <span className="run-view__count run-view__count--running">
              {counts.running} running
            </span>
          )}
          {counts.error > 0 && (
            <span className="run-view__count run-view__count--error">
              {counts.error} failed
            </span>
          )}
          {counts.pending > 0 && (
            <span className="run-view__count run-view__count--pending">
              {counts.pending} pending
            </span>
          )}
        </div>
      </header>

      <div className="run-view__body">
        <div className="run-view__tasks">
          <h2 className="run-view__section-title">Tasks ({tasks.length})</h2>
          {tasks.map((task) => {
            const StatusIcon = STATUS_ICON[task.status] ?? Circle;
            const ModeIcon = MODE_ICON[task.mode] ?? Circle;
            const isSelected = selectedTask?.id === task.id;
            return (
              <button
                key={task.id}
                type="button"
                className={`run-task-row${isSelected ? " run-task-row--selected" : ""}`}
                onClick={() => setSelectedTask(task)}
              >
                <StatusIcon
                  size={14}
                  className={`run-task-row__icon run-task-row__icon--${task.status}`}
                />
                <span className="run-task-row__id">{task.id}</span>
                <span className="run-task-row__title">{task.title}</span>
                <ModeIcon size={12} className="run-task-row__mode" />
              </button>
            );
          })}
          {tasks.length === 0 && runStatus.status === "starting" && (
            <div className="run-view__empty">
              <Loader2 size={20} className="run-view__spin" />
              <span>Compiling playbook...</span>
            </div>
          )}
        </div>

        <div className="run-view__detail">
          {selectedTask ? (
            <div className="run-task-detail">
              <h3 className="run-task-detail__title">{selectedTask.title}</h3>
              <div className="run-task-detail__meta">
                <span
                  className={`run-task-detail__status run-task-detail__status--${selectedTask.status}`}
                >
                  {selectedTask.status}
                </span>
                <span className="run-task-detail__mode">
                  {selectedTask.mode}
                </span>
              </div>
              {selectedTask.checks.length > 0 && (
                <div className="run-task-detail__checks">
                  <h4>Checks</h4>
                  {selectedTask.checks.map((c) => (
                    <div
                      key={c.id}
                      className={`run-check ${c.passed ? "run-check--pass" : "run-check--fail"}`}
                    >
                      {c.passed ? (
                        <CheckCircle size={12} />
                      ) : (
                        <XCircle size={12} />
                      )}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {selectedTask.attempts.length > 0 && (
                <div className="run-task-detail__attempts">
                  <h4>Attempts</h4>
                  {selectedTask.attempts.map((a) => (
                    <div key={a.attempt} className="run-attempt">
                      <span>#{a.attempt}</span>
                      <span
                        className={`run-attempt__status run-attempt__status--${a.status}`}
                      >
                        {a.status}
                      </span>
                      <span>{(a.durationMs / 1000).toFixed(1)}s</span>
                      {a.error && (
                        <p className="run-attempt__error">{a.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedTask.outputs.length > 0 && (
                <div className="run-task-detail__outputs">
                  <h4>Outputs</h4>
                  {selectedTask.outputs.map((o) => (
                    <code key={o}>{o}</code>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="run-view__log">
              <h3 className="run-view__section-title">Execution log</h3>
              <div className="run-log">
                {logs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`run-log__line run-log__line--${entry.stream}`}
                  >
                    <span className="run-log__ts">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="run-log__text">{entry.text}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="run-log__empty">Waiting for output...</div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
