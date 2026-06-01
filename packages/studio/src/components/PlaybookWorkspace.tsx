'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import { navigate } from '../router';
import type { EntryHomeView } from '../types';
import { PlaybookTab, TimelineTab, LogsTab, WorkspaceTabs } from './workspace';
import { ArtifactsTab } from './ArtifactsTab';
import { ChatPane } from './ChatPane';
import { EntryShell } from './EntryShell';
import type { PlaybookData, ChatMsg } from '../playbook-data';
import type { JournalEvent, TaskComment } from '../types';
import { getPlaybook, getRunState, listJournalEvents, listComments, addComment, cleanPlaybook, workspaceHeaders } from '../providers/converge-api';
import { mapApiToPlaybookData } from '../lib/mappers';

type TabId = 'playbook' | 'artifacts' | 'timeline' | 'logs';

const TABS: { id: TabId; label: string; glyph: string }[] = [
  { id: 'playbook', label: 'Playbook', glyph: '◇' },
  { id: 'artifacts', label: 'Artifacts', glyph: '◈' },
  { id: 'timeline', label: 'Timeline', glyph: '◉' },
  { id: 'logs', label: 'Logs', glyph: '›_' },
];

interface Props {
  playbookName: string;
  autoRun?: boolean;
}

export function PlaybookWorkspace({ playbookName, autoRun }: Props) {
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [journalEvents, setJournalEvents] = useState<JournalEvent[]>([]);
  const [liveLogs, setLiveLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('playbook');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ kind: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runActive, setRunActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsByTask, setCommentsByTask] = useState<Record<string, TaskComment[]>>({});
  const abortRef = useRef<AbortController | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatIdRef = useRef(0);

  // Fetch playbook data from API
  const loadData = useCallback(async () => {
    try {
      const [detail, rs, events, commentList] = await Promise.all([
        getPlaybook(playbookName),
        getRunState(playbookName),
        listJournalEvents(playbookName),
        listComments(playbookName).catch(() => [] as TaskComment[]),
      ]);

      const data = mapApiToPlaybookData({
        playbookName,
        description: detail?.description,
        runState: rs,
        journalEvents: events,
      });

      if (detail?.tasks?.length) {
        const handoffById = new Map<string, PlaybookTask['handoff']>();
        for (const task of detail.tasks) {
          if (task?.id && task.handoff) handoffById.set(task.id, task.handoff);
        }
        const mergeHandoff = (task: PlaybookTask): PlaybookTask => ({
          ...task,
          handoff: handoffById.get(task.id) ?? task.handoff ?? null,
          children: task.children?.map(mergeHandoff),
        });
        data.groups = data.groups.map(group => ({
          ...group,
          tasks: group.tasks.map(mergeHandoff),
        }));
      }

      const grouped: Record<string, TaskComment[]> = {};
      for (const c of commentList) {
        (grouped[c.taskId] ||= []).push(c);
      }
      for (const taskId of Object.keys(grouped)) {
        grouped[taskId].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      }

      setPlaybook(data);
      setJournalEvents(events);
      setCommentsByTask(grouped);
      setLoadError(null);
      if (chat.length === 0) {
        setChat(data.chat);
      }
      return data;
    } catch (err: any) {
      console.error('Failed to load playbook data:', err);
      setPlaybook(null);
      setLoadError(err?.message || 'Failed to load playbook');
      return null;
    }
  }, [playbookName]);

  useEffect(() => {
    loadData().then(() => setLoading(false));
  }, [loadData]);

  // Auto-run or poll running playbooks
  useEffect(() => {
    if (loading || !playbook) return;

    if (autoRun && playbook.counts.total === 0) {
      setActiveTab('logs');
      startRun();
    } else if (playbook.counts.live > 0) {
      startPolling();
    }

    return () => stopPolling();
  }, [loading, autoRun]);

  function startPolling() {
    if (pollRef.current) return;
    setRunActive(true);
    pollRef.current = setInterval(async () => {
      const data = await loadData();
      if (data && data.counts.live === 0 && data.counts.total > 0) {
        stopPolling();
        setRunActive(false);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    stopPolling();
    setRunActive(false);
  }

  async function handleReset() {
    if (typeof window !== 'undefined' && !window.confirm(`Reset "${playbookName}"? This deletes all run state and journal entries.`)) return;
    setRefreshing(true);
    try {
      await cleanPlaybook(playbookName);
      await loadData();
      setToast({ kind: 'approved', text: 'Playbook reset' });
      setTimeout(() => setToast(null), 3200);
    } catch (err: any) {
      pushChatMsg('tool', `✕ Reset failed: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (!runActive) {
        try {
          const res = await fetch(
            `/api/playbooks/${encodeURIComponent(playbookName)}/compile`,
            { method: 'POST', headers: workspaceHeaders() },
          );
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            pushChatMsg('tool', `✕ Compile failed: ${body.error || `HTTP ${res.status}`}`);
          }
        } catch (err: any) {
          pushChatMsg('tool', `✕ Compile error: ${err.message}`);
        }
      }
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  async function startRun() {
    setRunActive(true);
    pushChatMsg('tool', `Starting playbook run: ${playbookName}...`);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(
        `/api/playbooks/${encodeURIComponent(playbookName)}/run`,
        { method: 'POST', signal: abort.signal, headers: workspaceHeaders() },
      );

      if (!response.ok || !response.body) {
        pushChatMsg('tool', `✕ Run failed: HTTP ${response.status}`);
        setRunActive(false);
        return;
      }

      // Start polling runstate in parallel
      startPolling();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSE(currentEvent, data);
            } catch {}
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        pushChatMsg('tool', `✕ Run error: ${err.message}`);
      }
    } finally {
      stopPolling();
      await loadData();
      setRunActive(false);
    }
  }

  function handleSSE(event: string, data: any) {
    if (event === 'runstate' && data.nodes) {
      setPlaybook(prev => {
        if (!prev) return prev;
        const mapped = mapApiToPlaybookData({
          playbookName,
          description: prev.goal,
          runState: data,
          journalEvents: [],
        });
        return { ...mapped, chat: [] }; // preserve chat separately
      });
    }
    if (event === 'log') {
      const text = data.text;
      if (text) {
        // Append raw line to live logs buffer (no parsing)
        setLiveLogs(prev => prev + (prev ? '\n' : '') + text);
      }
    }
    if (event === 'run-event' && data.kind) {
      const taskId = data.taskId || '';
      const msg = data.kind === 'task-complete'
        ? `✓ ${taskId} · complete (${((data.durationMs || 0) / 1000).toFixed(1)}s)`
        : data.kind === 'task-failed'
        ? `✕ ${taskId} · failed: ${data.error || ''}`
        : data.kind === 'task-start'
        ? `● ${taskId} · started (attempt ${data.attempt || 1})`
        : data.kind === 'run-complete'
        ? `✓ Run complete · ${data.completed} passed, ${data.failed} failed`
        : `[${data.kind}] ${taskId}`;
      pushChatMsg('tool', msg);

      // Also push to journalEvents so the Timeline updates live
      const kindToEventType: Record<string, string> = {
        'task-start': 'TASK_ATTEMPT_START',
        'task-complete': 'TASK_EXECUTION_COMPLETE',
        'task-failed': 'TASK_FAILED',
        'run-complete': 'EXECUTION_END',
      };
      const eventType = kindToEventType[data.kind] || data.kind;
      const synthEvent: JournalEvent = {
        timestamp: new Date().toISOString(),
        eventType: eventType as any,
        level: taskId ? 'task' as any : 'project' as any,
        scope: taskId || playbookName,
        message: msg,
        metadata: { taskId, ...data },
      };
      setJournalEvents(prev => [...prev, synthEvent]);
    }
    if (event === 'run-status') {
      if (data.status === 'complete') {
        pushChatMsg('agent', 'Run complete. All tasks have been processed.');
        setToast({ kind: 'approved', text: 'Run complete' });
        setTimeout(() => setToast(null), 3200);
      } else if (data.status === 'failed') {
        pushChatMsg('agent', 'Run finished with failures. Check the task list for details.');
        setToast({ kind: 'rejected', text: 'Run failed' });
        setTimeout(() => setToast(null), 3200);
      }
    }
  }

  function pushChatMsg(role: 'user' | 'agent' | 'tool' | 'system', text: string) {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setChat(prev => [...prev, { id: `m${++chatIdRef.current}`, role, ts, text }]);
  }

  function handleToggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submitReview(id: string, decision: 'approve' | 'revise' | 'reject', feedback?: string) {
    const res = await fetch(
      `/api/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(id)}/review`,
      {
        method: 'POST',
        headers: { ...workspaceHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, feedback: feedback ?? '' }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
  }

  async function handleApprove(id: string) {
    try {
      await submitReview(id, 'approve');
      pushChatMsg('tool', `✓ ${id} · approved`);
      setToast({ kind: 'approved', text: 'Approved · run `converge run --resume` to continue' });
      setTimeout(() => setToast(null), 3200);
      await loadData();
    } catch (err: any) {
      pushChatMsg('tool', `✕ approve failed: ${err.message}`);
    }
  }

  async function handleChanges(id: string, data: { note: string; tags: string[] }) {
    try {
      await submitReview(id, 'reject', data.note);
      pushChatMsg('tool', `✕ ${id} · rejected · "${data.note.slice(0, 60)}"`);
      setToast({ kind: 'changes', text: 'Rejected · run `converge run --resume`' });
      setTimeout(() => setToast(null), 3200);
      await handleAddComment(id, 'rework', data.note).catch(() => { /* note is best-effort */ });
      await loadData();
    } catch (err: any) {
      pushChatMsg('tool', `✕ reject failed: ${err.message}`);
    }
  }

  async function handleAddComment(taskId: string, kind: 'comment' | 'rework', body: string) {
    const comment = await addComment(playbookName, { taskId, body, kind });
    setCommentsByTask(prev => {
      const existing = prev[taskId] ?? [];
      return { ...prev, [taskId]: [comment, ...existing] };
    });
    setToast({
      kind: kind === 'rework' ? 'changes' : 'approved',
      text: kind === 'rework' ? 'Rework requested · saved' : 'Comment added',
    });
    setTimeout(() => setToast(null), 3200);
  }

  function handleSend(text: string) {
    pushChatMsg('user', text);
    setTimeout(() => {
      pushChatMsg('agent', 'Acknowledged. Queued as a follow-up task on the next wave.');
    }, 400);
  }

  function handleJumpToReview() {
    setActiveTab('playbook');
    const main = document.getElementById('cv-workspace-body');
    if (main) main.scrollTop = 0;
  }

  const topbarActions = (
    <>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={refreshing}
        title={runActive ? 'Refresh state' : 'Recompile and refresh'}
        aria-label={runActive ? 'Refresh state' : 'Recompile and refresh'}
        style={{
          width: 28, height: 28, padding: 0,
          border: '1px solid var(--cv-border)', borderRadius: 4,
          background: 'transparent', color: 'var(--cv-text-muted)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: refreshing ? 'wait' : 'pointer',
          transition: 'color 120ms ease, border-color 120ms ease',
        }}
      >
        {refreshing
          ? <Loader2 size={14} style={{ animation: 'cv-spin 1s linear infinite' }} />
          : <RefreshCw size={14} />}
      </button>
      <button className="cv-btn cv-btn--ghost" style={{ padding: '5px 10px', fontSize: 12 }}>↗ Share</button>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'var(--cv-text)', color: 'var(--cv-bg)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--cv-sans)', fontWeight: 600, fontSize: 12,
      }}>M</div>
    </>
  );

  const shell = (body: ReactNode) => (
    <EntryShell
      view="playbooks"
      onViewChange={(v: EntryHomeView) => navigate({ kind: 'home', view: v })}
      fillBody
      topbarActions={topbarActions}
    >
      {body}
    </EntryShell>
  );

  if (loading) {
    return shell(
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--cv-bg)', gap: 8,
        fontFamily: 'var(--cv-mono)', fontSize: 13, color: 'var(--cv-text-dim)',
      }}>
        <Loader2 size={18} style={{ animation: 'cv-spin 1s linear infinite' }} />
        Loading playbook...
      </div>
    );
  }

  if (!playbook) {
    return shell(
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'var(--cv-bg)', gap: 12,
        fontFamily: 'var(--cv-mono)', fontSize: 13, color: 'var(--cv-text-dim)',
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, color: 'var(--cv-text)' }}>
          Failed to load playbook <strong>{playbookName}</strong>
        </div>
        {loadError && <div style={{ maxWidth: 520 }}>{loadError}</div>}
        <button
          className="cv-btn cv-btn--ghost"
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => { setLoading(true); loadData().then(() => setLoading(false)); }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Merge chat into playbook for ChatPane
  const playbookWithChat: PlaybookData = { ...playbook, chat };

  return shell(
    <div style={{
      display: 'grid',
      gridTemplateColumns: '360px minmax(0, 1fr)',
      height: '100%',
      minHeight: 0,
      background: 'var(--cv-bg)',
      color: 'var(--cv-text)',
      fontFamily: 'var(--cv-sans)',
      overflow: 'hidden',
    }}>
      <ChatPane
        playbook={playbookWithChat}
        chat={chat}
        onSend={handleSend}
        onJumpToReview={handleJumpToReview}
      />
      <main style={{
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        minWidth: 0,
        minHeight: 0,
        background: 'var(--cv-bg)',
      }}>
        <WorkspaceTabs
          tabs={TABS}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as TabId)}
          awaitingCount={playbook.counts.awaiting}
        />
        <div id="cv-workspace-body" style={{ overflowY: 'auto', minHeight: 0, background: '#F5F2EA' }}>
          {activeTab === 'playbook' && (
            <PlaybookTab
              playbook={playbookWithChat}
              expanded={expanded}
              onToggle={handleToggle}
              onApprove={handleApprove}
              onChanges={handleChanges}
              warning={null}
              runActive={runActive}
              onRun={startRun}
              onStop={handleStop}
              onReset={handleReset}
              commentsByTask={commentsByTask}
              onAddComment={handleAddComment}
            />
          )}
          {activeTab === 'timeline' && <TimelineTab events={journalEvents} />}
          {activeTab === 'artifacts' && <ArtifactsTab playbook={playbook} />}
          {activeTab === 'logs' && (
            <LogsTab playbookName={playbookName} liveLogs={liveLogs} live={runActive} />
          )}
        </div>
      </main>
      {toast && <Toast kind={toast.kind} text={toast.text} />}
    </div>
  );
}

function Toast({ kind, text }: { kind: string; text: string }) {
  const map: Record<string, { bg: string; glyph: string }> = {
    approved: { bg: 'var(--cv-status-ok)', glyph: '✓' },
    changes: { bg: 'var(--cv-status-delta)', glyph: 'Δ' },
    rejected: { bg: 'var(--cv-status-fail)', glyph: '✕' },
  };
  const m = map[kind] || map.approved;
  return (
    <div style={{
      position: 'fixed', bottom: 18, left: 'calc(56px + 360px + (100vw - 56px - 360px) / 2)',
      transform: 'translateX(-50%)',
      display: 'inline-flex', alignItems: 'center', gap: 10,
      padding: '8px 14px',
      background: 'var(--cv-text)', color: '#FFFFFF',
      borderRadius: 2, boxShadow: 'var(--cv-shadow-pop)',
      fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 500,
      zIndex: 100,
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 2,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: m.bg, color: '#FFFFFF',
        fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 600,
      }}>{m.glyph}</span>
      {text}
    </div>
  );
}
