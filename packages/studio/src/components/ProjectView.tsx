import { useEffect, useState, useRef, useCallback } from "react";
import type {
  PlaybookDetail,
  TaskNode,
  RunState,
  JournalEvent,
} from "../types";
import {
  getPlaybook,
  getRunState,
  listJournalEvents,
} from "../providers/converge-api";
import { navigate } from "../router";
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
  Play,
} from "lucide-react";

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
  ts: string;
  stream: string;
  text: string;
}

interface Props {
  playbookName: string;
  taskId?: string | null;
  autoRun?: boolean;
}

export function ProjectView({ playbookName, taskId, autoRun }: Props) {
  const [detail, setDetail] = useState<PlaybookDetail | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tasks" | "journal" | "log">(
    "tasks",
  );
  const [journalEvents, setJournalEvents] = useState<JournalEvent[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [runActive, setRunActive] = useState(false);
  const [runStatus, setRunStatus] = useState("");
  const logIdRef = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load playbook detail
  const loadDetail = useCallback(async () => {
    try {
      const pb = await getPlaybook(playbookName);
      if (pb) {
        setDetail(pb);
        if (taskId) {
          const t = pb.tasks.find((n) => n.id === taskId);
          if (t) setSelectedTask(t);
        }
      }
    } catch {}
  }, [playbookName, taskId]);

  useEffect(() => {
    loadDetail().then(() => setLoading(false));
  }, [loadDetail]);

  // Load journal events
  useEffect(() => {
    listJournalEvents(playbookName)
      .then(setJournalEvents)
      .catch(() => {});
  }, [playbookName]);

  // Auto-start run if requested, or start polling if already running
  useEffect(() => {
    if (!detail) return;

    if (autoRun && detail.status === "pending") {
      startRun();
    } else if (detail.status === "running") {
      startPolling();
    }

    return () => stopPolling();
  }, [detail?.status, autoRun]);

  function startPolling() {
    if (pollRef.current) return;
    setRunActive(true);
    setRunStatus("running");
    pollRef.current = setInterval(async () => {
      await loadDetail();
      const events = await listJournalEvents(playbookName).catch(() => []);
      if (events.length > 0) setJournalEvents(events);
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function startRun() {
    setRunActive(true);
    setRunStatus("starting");
    setActiveTab("log");
    setLogs([]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/run`,
        { method: "POST", signal: abort.signal },
      );

      if (!response.ok || !response.body) {
        setRunStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Start polling runstate alongside SSE
      startPolling();

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
              handleSSEEvent(currentEvent, data);
            } catch {}
            currentEvent = "";
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setRunStatus("error");
      }
    } finally {
      stopPolling();
      await loadDetail();
      const events = await listJournalEvents(playbookName).catch(() => []);
      if (events.length > 0) setJournalEvents(events);
    }
  }

  function handleSSEEvent(event: string, data: any) {
    if (event === "runstate" && data.nodes) {
      setDetail((prev) =>
        prev ? { ...prev, tasks: data.nodes, status: data.status } : prev,
      );
    }
    if (event === "log") {
      setLogs((prev) => [
        ...prev,
        {
          id: ++logIdRef.current,
          ts: new Date().toLocaleTimeString(),
          stream: data.stream,
          text: data.text,
        },
      ]);
    }
    if (event === "run-event") {
      setLogs((prev) => [
        ...prev,
        {
          id: ++logIdRef.current,
          ts: new Date().toLocaleTimeString(),
          stream: "event",
          text: `[${data.kind}] ${data.taskId || ""} ${data.message || ""}`.trim(),
        },
      ]);
    }
    if (event === "run-status") {
      setRunStatus(data.status);
      if (data.status === "complete" || data.status === "failed") {
        setRunActive(false);
        loadDetail();
      }
    }
  }

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (loading) {
    return (
      <div className="project-view project-view--loading">
        <Loader2 className="project-view__spinner" size={24} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="project-view project-view--empty">
        <p>Playbook &ldquo;{playbookName}&rdquo; not found.</p>
      </div>
    );
  }

  const tasks = detail.tasks;
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
    <div className="project-view">
      {/* Left column: execution log / chat */}
      <div className="project-view__chat">
        <div className="project-view__chat-header">
          <button
            type="button"
            className="project-view__back-btn"
            onClick={() => navigate({ kind: "home", view: "home" })}
          >
            <ArrowLeft size={14} /> Home
          </button>
          <span className="project-view__chat-title">{playbookName}</span>
          {runStatus && (
            <span className={`run-view__badge run-view__badge--${runStatus}`}>
              {runStatus === "starting" || runStatus === "running" ? (
                <Loader2 size={10} className="run-view__spin" />
              ) : null}
              {runStatus}
            </span>
          )}
        </div>
        <div className="project-view__log-body">
          {logs.length > 0 ? (
            <div
              className="run-log"
              style={{ border: "none", borderRadius: 0, maxHeight: "100%" }}
            >
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`run-log__line run-log__line--${entry.stream}`}
                >
                  <span className="run-log__ts">{entry.ts}</span>
                  <span className="run-log__text">{entry.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          ) : (
            <div
              style={{
                padding: 16,
                color: "var(--cv-text-muted)",
                fontSize: 13,
              }}
            >
              <p>{detail.description}</p>
              {detail.status === "pending" && !runActive && (
                <button
                  type="button"
                  className="folder-picker__run"
                  onClick={() => startRun()}
                  style={{ marginTop: 12 }}
                >
                  <Play size={14} /> Run playbook
                </button>
              )}
              {counts.pass > 0 && (
                <p style={{ marginTop: 8 }}>
                  {counts.pass}/{counts.total} tasks completed
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Center column: task detail or overview */}
      <div className="project-view__viewer">
        <div className="project-view__viewer-header">
          <div className="project-view__viewer-tabs">
            <button
              type="button"
              className={`project-view__tab${activeTab === "tasks" ? " project-view__tab--active" : ""}`}
              onClick={() => setActiveTab("tasks")}
            >
              Tasks ({tasks.length})
            </button>
            <button
              type="button"
              className={`project-view__tab${activeTab === "journal" ? " project-view__tab--active" : ""}`}
              onClick={() => setActiveTab("journal")}
            >
              Journal
            </button>
            <button
              type="button"
              className={`project-view__tab${activeTab === "log" ? " project-view__tab--active" : ""}`}
              onClick={() => setActiveTab("log")}
            >
              Log
            </button>
          </div>
          <div className="run-view__counts" style={{ padding: "0 12px" }}>
            {counts.pass > 0 && (
              <span className="run-view__count run-view__count--pass">
                {counts.pass} pass
              </span>
            )}
            {counts.running > 0 && (
              <span className="run-view__count run-view__count--running">
                {counts.running} running
              </span>
            )}
            {counts.error > 0 && (
              <span className="run-view__count run-view__count--error">
                {counts.error} error
              </span>
            )}
          </div>
        </div>
        <div className="project-view__viewer-body">
          {activeTab === "tasks" &&
            (selectedTask ? (
              <div className="task-detail">
                <button
                  type="button"
                  className="project-view__back-btn"
                  onClick={() => setSelectedTask(null)}
                  style={{ marginBottom: 12 }}
                >
                  <ArrowLeft size={14} /> All tasks
                </button>
                <h2
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "var(--cv-mono)",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {selectedTask.title}
                </h2>
                <div className="task-detail__meta">
                  <span
                    className={`task-status task-status--${selectedTask.status}`}
                  >
                    {selectedTask.status}
                  </span>
                  <span className="task-mode">{selectedTask.mode}</span>
                </div>
                {selectedTask.checks.length > 0 && (
                  <div className="task-detail__checks">
                    <h3>Checks</h3>
                    {selectedTask.checks.map((c) => (
                      <div
                        key={c.id}
                        className={`check-item check-item--${c.passed ? "pass" : "fail"}`}
                      >
                        {c.passed ? (
                          <CheckCircle size={14} />
                        ) : (
                          <XCircle size={14} />
                        )}
                        <span>{c.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTask.attempts.length > 0 && (
                  <div className="task-detail__attempts">
                    <h3>Attempts</h3>
                    {selectedTask.attempts.map((a) => (
                      <div key={a.attempt} className="attempt-item">
                        <span className="attempt-item__num">#{a.attempt}</span>
                        <span
                          className={`attempt-item__status attempt-item__status--${a.status}`}
                        >
                          {a.status}
                        </span>
                        <span className="attempt-item__duration">
                          {(a.durationMs / 1000).toFixed(1)}s
                        </span>
                        {a.error && (
                          <p className="attempt-item__error">{a.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {selectedTask.outputs.length > 0 && (
                  <div className="task-detail__outputs">
                    <h3>Outputs</h3>
                    {selectedTask.outputs.map((o) => (
                      <div key={o} className="output-item">
                        {o}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="playbook-overview">
                {tasks.map((task) => {
                  const StatusIcon = STATUS_ICON[task.status] ?? Circle;
                  const ModeIcon = MODE_ICON[task.mode] ?? Circle;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className="task-tree-node"
                      onClick={() => setSelectedTask(task)}
                    >
                      <StatusIcon
                        size={14}
                        className={`task-tree-node__status task-tree-node__status--${task.status}`}
                      />
                      <ModeIcon size={12} className="task-tree-node__mode" />
                      <span className="task-tree-node__title">
                        {task.title}
                      </span>
                      <span className="task-tree-node__duration">
                        {task.attempts.length > 0
                          ? `${((task.attempts[task.attempts.length - 1]?.durationMs ?? 0) / 1000).toFixed(1)}s`
                          : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

          {activeTab === "journal" && (
            <div className="journal-view">
              {journalEvents.length > 0 ? (
                <div
                  className="run-log"
                  style={{ background: "var(--cv-bg-code)" }}
                >
                  {journalEvents.slice(-100).map((ev, i) => (
                    <div key={i} className="run-log__line">
                      <span className="run-log__ts">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className="run-log__text"
                        style={{
                          color:
                            ev.eventType?.includes("FAIL") ||
                            ev.eventType?.includes("ERROR")
                              ? "#FCA5A5"
                              : ev.eventType?.includes("COMPLETE") ||
                                  ev.eventType?.includes("PASS")
                                ? "#86EFAC"
                                : "#CBD5E1",
                        }}
                      >
                        [{ev.eventType || (ev as any).type}]{" "}
                        {ev.scope || (ev as any).taskId} {ev.message || ""}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--cv-text-muted)", fontSize: 13 }}>
                  No journal events yet.
                </p>
              )}
            </div>
          )}

          {activeTab === "log" && (
            <div
              className="run-log"
              style={{
                background: "var(--cv-bg-code)",
                maxHeight: "calc(100vh - 180px)",
              }}
            >
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`run-log__line run-log__line--${entry.stream}`}
                >
                  <span className="run-log__ts">{entry.ts}</span>
                  <span className="run-log__text">{entry.text}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="run-log__empty">
                  No execution log yet. Click "Run playbook" to start.
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Right column: task list */}
      <div className="project-view__panel">
        <div className="project-view__panel-header">
          Tasks ({tasks.length})
          {runActive && (
            <Loader2
              size={12}
              className="run-view__spin"
              style={{ marginLeft: 6 }}
            />
          )}
        </div>
        <div className="project-view__task-tree">
          {tasks.map((task) => {
            const StatusIcon = STATUS_ICON[task.status] ?? Circle;
            const isSelected = selectedTask?.id === task.id;
            return (
              <button
                key={task.id}
                type="button"
                className={`task-tree-node${isSelected ? " task-tree-node--selected" : ""}`}
                onClick={() => {
                  setSelectedTask(task);
                  setActiveTab("tasks");
                }}
              >
                <StatusIcon
                  size={14}
                  className={`task-tree-node__status task-tree-node__status--${task.status}`}
                />
                <span className="task-tree-node__title">{task.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
