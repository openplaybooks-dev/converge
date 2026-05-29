import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { marked } from 'marked';
import type { PlaybookData, PlaybookTask, TaskGroup as TG } from '../playbook-data';
import type { JournalEvent, TaskComment } from '../types';

marked.setOptions({ gfm: true, breaks: false });
import { StatusGlyph, ReviewPill, Pill, Caption, MetaCell, statusLabel, emphKeywords, italicize } from './primitives';
import { ArtifactPreviewModal } from './preview/ArtifactPreviewModal';
import { workspaceHeaders } from '../providers/converge-api';

export function WorkspaceTabs({ tabs, activeId, onSelect, awaitingCount }: {
  tabs: { id: string; label: string; glyph: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  awaitingCount: number;
}) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center',
      gap: 12, padding: '0 16px',
      borderBottom: '1px solid var(--cv-border)',
      background: 'var(--cv-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
        {tabs.map(t => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{
                padding: '10px 12px 9px', border: 'none', background: 'transparent',
                borderBottom: active ? '2px solid var(--cv-text)' : '2px solid transparent',
                fontFamily: 'var(--cv-sans)', fontSize: 12.5,
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--cv-text)' : 'var(--cv-text-muted)',
                cursor: 'pointer', transition: 'color 120ms ease, border-color 120ms ease',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, color: 'var(--cv-text-dim)' }}>{t.glyph}</span>
              {t.label}
              {t.id === 'playbook' && awaitingCount > 0 && (
                <span style={{
                  fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 600,
                  background: 'var(--cv-status-delta)', color: '#FFF',
                  padding: '1px 6px', borderRadius: 2,
                }}>{awaitingCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

function ReviewSpotlight({ task, queueSize, queueIndex, onApprove, onChanges, onNext }: {
  task: PlaybookTask;
  queueSize: number;
  queueIndex: number;
  onApprove: (id: string) => void;
  onChanges: (id: string, data: { note: string; tags: string[] }) => void;
  onNext: () => void;
}) {
  const [openForm, setOpenForm] = useState(false);
  const [note, setNote] = useState('');
  const submit = () => {
    onChanges(task.id, { note, tags: [] });
    setOpenForm(false); setNote('');
  };

  const stackBehind = Math.max(0, Math.min(2, queueSize - queueIndex - 1));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <Caption color="#92400E">◆ Needs review{queueSize > 1 ? ` · ${queueIndex + 1} of ${queueSize}` : ''}</Caption>
        {queueSize > 1 && (
          <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onNext}>Skip · next →</button>
        )}
      </div>
      <div style={{ position: 'relative', marginBottom: stackBehind * 8 }}>
        {[...Array(stackBehind)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', top: (i + 1) * 8, left: (i + 1) * 8, right: (i + 1) * 8, bottom: -(i + 1) * 8,
            background: '#FFFFFF', border: '1px solid var(--cv-border)', borderRadius: 6,
            opacity: 1 - (i + 1) * 0.25, zIndex: 0, pointerEvents: 'none',
          }} aria-hidden="true" />
        ))}
        <article style={{
          position: 'relative', zIndex: 1, background: '#FFFFFF',
          border: '1px solid var(--cv-border)', borderLeft: '3px solid var(--cv-status-delta)',
          borderRadius: 6, overflow: 'hidden', boxShadow: 'var(--cv-shadow-pop)',
        }}>
          <header style={{ padding: '14px 20px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <Pill>{task.mode}</Pill>
              <ReviewPill state="changes">◆ awaiting human</ReviewPill>
              <span style={{ flex: 1 }} />
              <button onClick={() => onApprove(task.id)} className="cv-btn cv-btn--approve">👍 Looks good</button>
              <button onClick={() => setOpenForm(!openForm)} className={`cv-btn cv-btn--changes${openForm ? ' cv-btn--changes--active' : ''}`}>💬 Needs work…</button>
            </div>
            {openForm && (
              <div style={{ background: '#FAFAF7', border: '1px solid var(--cv-border)', borderRadius: 2, padding: '10px 14px', marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
                  placeholder="What needs to change? Feeds back into the runner as additional context on respawn."
                  style={{ resize: 'vertical', padding: '8px 10px', fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.5, border: '1px solid var(--cv-border-strong)', borderRadius: 2, background: '#FFFFFF', color: 'var(--cv-text)' }}
                />
<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button onClick={() => setOpenForm(false)} className="cv-btn cv-btn--ghost" style={{ padding: '5px 12px', fontSize: 12.5 }}>Cancel</button>
                  <button onClick={submit} disabled={!note.trim()} style={{ padding: '5px 14px', fontSize: 12.5, fontWeight: 600, opacity: note.trim() ? 1 : 0.5, cursor: note.trim() ? 'pointer' : 'not-allowed', background: '#92400E', borderColor: '#92400E', color: '#FFF', border: '1px solid', borderRadius: 2, fontFamily: 'var(--cv-sans)' }}>Submit changes</button>
                </div>
              </div>
            )}
            <h2 style={{
              margin: '0 0 4px', fontFamily: 'var(--cv-mono)', fontSize: 15, fontWeight: 500,
              letterSpacing: '-0.01em', color: 'var(--cv-text)',
            }}>{task.title}</h2>
            <p style={{
              margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.5,
              color: 'var(--cv-text-muted)', maxWidth: '64ch',
            }} dangerouslySetInnerHTML={{ __html: emphKeywords(task.summary) }} />
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, padding: '0 20px 16px' }}>
            {task.outputs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Caption>Outputs · {task.outputs.length}</Caption>
                {task.outputs.map((p, i) => (
                  <code key={i} style={{ fontFamily: 'var(--cv-mono)', fontSize: 12.5, background: '#FAFAF7', border: '1px solid var(--cv-border)', padding: '4px 8px', borderRadius: 2 }}>{p}</code>
                ))}
              </div>
            )}
            {task.checks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Caption>Checks · {task.checks.length}</Caption>
                {task.checks.map((c, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center', padding: '5px 8px', background: '#FAFAF7', border: '1px solid var(--cv-border)', borderRadius: 2 }}>
                    <StatusGlyph status={c.exit === 0 ? 'ok' : 'fail'} />
                    <span style={{ fontSize: 12.5 }}>{c.label}</span>
                    <Caption color={c.exit === 0 ? 'var(--cv-status-ok)' : 'var(--cv-status-fail)'}>{c.exit === 0 ? 'pass' : 'fail'}</Caption>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

const cardStyle = { background: '#FFFFFF', border: '1px solid var(--cv-border)', borderRadius: 4, overflow: 'hidden' as const, boxShadow: '0 1px 3px rgba(17,24,39,0.06), 0 1px 2px rgba(17,24,39,0.04)' };

function TaskTreeRow({ task, depth, expanded, selectedTaskId, onToggle, onSelect }: {
  task: PlaybookTask;
  depth: number;
  expanded: Set<string>;
  selectedTaskId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = !!(task.children && task.children.length > 0);
  const isExpanded = expanded.has(task.id);
  const isSelected = selectedTaskId === task.id;

  return (
    <>
      <div
        onClick={() => onSelect(task.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', paddingLeft: 14 + depth * 16,
          background: isSelected ? '#FAFAF7' : '#FFFFFF',
          borderLeft: `2px solid ${isSelected ? 'var(--cv-accent-warm)' : 'transparent'}`,
          borderBottom: '1px solid var(--cv-border)',
          cursor: 'pointer', fontFamily: 'var(--cv-sans)', color: 'var(--cv-text)',
          transition: 'background 120ms ease, border-color 120ms ease',
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            style={{
              width: 16, height: 16, padding: 0, border: 'none', background: 'transparent',
              color: 'var(--cv-text-dim)', fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 600,
              cursor: 'pointer', transition: 'transform 160ms ease',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >›</button>
        ) : (
          <span style={{ width: 16, flexShrink: 0 }} />
        )}
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.title}</span>
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {task.mode}{task.duration ? ` · ${task.duration}` : ''}{task.progress ? ` · ${task.progress.done}/${task.progress.total}` : ''}
        </span>
        <StatusGlyph status={task.status} size={12} />
      </div>
      {hasChildren && isExpanded && task.children!.map(child => (
        <TaskTreeRow
          key={child.id}
          task={child}
          depth={depth + 1}
          expanded={expanded}
          selectedTaskId={selectedTaskId}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function TaskTree({ groups, expanded, selectedTaskId, onToggle, onSelect }: {
  groups: TG[];
  expanded: Set<string>;
  selectedTaskId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={cardStyle}>
      {groups.map((g, gi) => (
        <React.Fragment key={g.id}>
          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
            gap: 16, padding: '10px 14px 8px',
            background: '#F5F2EA',
            borderTop: gi === 0 ? 'none' : '1px solid var(--cv-border)',
            borderBottom: '1px solid var(--cv-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <Caption>{`Step ${String(gi + 1).padStart(2, '0')}`}</Caption>
              <span style={{ fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 600, color: 'var(--cv-text)' }}>{g.title}</span>
            </div>
            <Caption>{g.tasks.length} {g.tasks.length === 1 ? 'task' : 'tasks'}</Caption>
          </div>
          {g.tasks.map(t => (
            <TaskTreeRow
              key={t.id}
              task={t}
              depth={0}
              expanded={expanded}
              selectedTaskId={selectedTaskId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 14, borderTop: '1px solid var(--cv-border)' }}>
      <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cv-text-dim)' }}>{label}</span>
      {children}
    </section>
  );
}

function Chips({ items, empty = '—' }: { items: string[] | undefined; empty?: string }) {
  if (!items || items.length === 0) {
    return <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>{empty}</span>;
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(it => (
        <span key={it} style={{
          fontFamily: 'var(--cv-mono)', fontSize: 11,
          padding: '2px 8px', borderRadius: 2,
          background: '#F5F2EA', color: 'var(--cv-text-muted)',
          border: '1px solid var(--cv-border)',
        }}>{it}</span>
      ))}
    </div>
  );
}

function fmtRelative(ts: string): string {
  const then = new Date(ts).getTime();
  if (Number.isNaN(then)) return ts;
  const diff = Date.now() - then;
  if (diff < 0) return 'just now';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function CommentsSection({ comments, onAdd }: {
  comments: TaskComment[];
  onAdd: (kind: 'comment' | 'rework', body: string) => Promise<void>;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState<'comment' | 'rework' | null>(null);
  const trimmed = body.trim();

  async function submit(kind: 'comment' | 'rework') {
    if (!trimmed || busy) return;
    setBusy(kind);
    try {
      await onAdd(kind, trimmed);
      setBody('');
    } catch (err: any) {
      console.error('addComment failed:', err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <DetailSection label={`Comments (${comments.length})`}>
      {comments.length === 0 ? (
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>—</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {comments.map(c => (
            <div key={c.id} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '8px 10px',
              background: c.kind === 'rework' ? 'var(--cv-review-changes-bg)' : '#FAFAF7',
              borderLeft: `2px solid ${c.kind === 'rework' ? 'var(--cv-status-delta)' : 'var(--cv-border)'}`,
              borderRadius: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--cv-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                <span style={{ color: c.kind === 'rework' ? 'var(--cv-status-delta)' : 'var(--cv-text-muted)', fontWeight: 600 }}>
                  {c.kind === 'rework' ? 'Δ rework' : '· comment'}
                </span>
                <span style={{ color: 'var(--cv-text-dim)' }}>{fmtRelative(c.timestamp)}</span>
              </div>
              <p style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.5, color: 'var(--cv-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.body}</p>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={2}
          placeholder="Add a comment or describe what needs rework…"
          style={{
            resize: 'vertical', padding: '8px 10px',
            fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.5,
            border: '1px solid var(--cv-border-strong)', borderRadius: 2,
            background: '#FFFFFF', color: 'var(--cv-text)',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => submit('comment')}
            disabled={!trimmed || !!busy}
            className="cv-btn cv-btn--ghost"
            style={{ padding: '5px 12px', fontSize: 12, opacity: trimmed && !busy ? 1 : 0.5, cursor: trimmed && !busy ? 'pointer' : 'not-allowed' }}
          >
            {busy === 'comment' ? '…' : '💬 Add comment'}
          </button>
          <button
            type="button"
            onClick={() => submit('rework')}
            disabled={!trimmed || !!busy}
            style={{
              padding: '5px 14px', fontSize: 12, fontWeight: 600,
              border: '1px solid #92400E', background: '#92400E', color: '#FFF',
              borderRadius: 2, fontFamily: 'var(--cv-sans)',
              opacity: trimmed && !busy ? 1 : 0.5,
              cursor: trimmed && !busy ? 'pointer' : 'not-allowed',
            }}
          >
            {busy === 'rework' ? '…' : 'Δ Needs rework'}
          </button>
        </div>
      </div>
    </DetailSection>
  );
}

interface ProducedFile { path: string; name: string; size?: number }
interface ProducedResponse { taskId: string; patterns: string[]; files: ProducedFile[] }

function TaskDetailPanel({ task, playbookName, comments, onAddComment, onClose }: {
  task: PlaybookTask;
  playbookName: string;
  comments: TaskComment[];
  onAddComment: (kind: 'comment' | 'rework', body: string) => Promise<void>;
  onClose: () => void;
}) {
  const attempts = task.attempts ?? [];

  const [produced, setProduced] = useState<ProducedFile[] | null>(null);
  const [producedLoading, setProducedLoading] = useState(false);
  const [producedModalPath, setProducedModalPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProduced(null);
    if (!task.outputs || task.outputs.length === 0) return;
    setProducedLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(task.id)}/artifacts`,
          { headers: workspaceHeaders() },
        );
        if (cancelled) return;
        if (res.ok) {
          const data: ProducedResponse = await res.json();
          setProduced(data.files ?? []);
        } else {
          setProduced([]);
        }
      } catch {
        if (!cancelled) setProduced([]);
      }
      if (!cancelled) setProducedLoading(false);
    })();
    return () => { cancelled = true; };
  }, [playbookName, task.id, task.outputs]);

  return (
    <>
    <div
      onClick={onClose}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 19,
        background: 'transparent',
      }}
    />
    <aside style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 640, zIndex: 20,
      background: '#FFFFFF',
      borderLeft: '1px solid var(--cv-border)',
      boxShadow: '-12px 0 32px rgba(17,24,39,0.14), -4px 0 12px rgba(17,24,39,0.08)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
      animation: 'cv-drawer-slide 180ms ease-out',
    }}>
      <header style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '14px 16px', borderBottom: '1px solid var(--cv-border)',
        background: '#FFFFFF', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <StatusGlyph status={task.status} size={14} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 15, fontWeight: 600, color: 'var(--cv-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</h2>
          <div style={{ marginTop: 4, fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {[task.mode, task.group, task.duration].filter(Boolean).join(' · ')}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            width: 24, height: 24, padding: 0, border: 'none', background: 'transparent',
            color: 'var(--cv-text-dim)', fontFamily: 'var(--cv-mono)', fontSize: 14, cursor: 'pointer',
          }}
        >✕</button>
      </header>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {task.description && task.description !== task.title && (
          <p style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--cv-text-muted)' }}>{task.description}</p>
        )}
        {task.summary && task.summary !== task.title && task.summary !== task.description && (
          <p style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 12.5, lineHeight: 1.55, color: 'var(--cv-text-muted)' }} dangerouslySetInnerHTML={{ __html: emphKeywords(task.summary) }} />
        )}
        {task.body && (
          <DetailSection label="Body">
            <div
              className="cv-md"
              style={{
                padding: '12px 14px',
                background: '#FAFAF7', border: '1px solid var(--cv-border)', borderRadius: 2,
                fontFamily: 'var(--cv-sans)', fontSize: 13, lineHeight: 1.6,
                color: 'var(--cv-text)',
                maxHeight: 420, overflowY: 'auto',
                wordBreak: 'break-word',
              }}
              dangerouslySetInnerHTML={{ __html: marked.parse(task.body) as string }}
            />
          </DetailSection>
        )}
        {task.tags && task.tags.length > 0 && (
          <DetailSection label="Tags"><Chips items={task.tags} /></DetailSection>
        )}
        {(task.agent || task.skill) && (
          <DetailSection label="Executor">
            <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11.5, color: 'var(--cv-text)' }}>
              {[task.agent, Array.isArray(task.skill) ? task.skill.join(', ') : task.skill].filter(Boolean).join(' · ')}
            </span>
          </DetailSection>
        )}
        <DetailSection label="Inputs"><Chips items={task.inputs} empty="—" /></DetailSection>
        <DetailSection label="Outputs"><Chips items={task.outputs} empty="—" /></DetailSection>
        {task.outputs && task.outputs.length > 0 && (
          <DetailSection label="Artifacts">
            {producedLoading ? (
              <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>Checking disk…</span>
            ) : !produced || produced.length === 0 ? (
              <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>
                No files matched these patterns yet.
              </span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {produced.map(f => (
                  <button
                    key={f.path}
                    type="button"
                    onClick={() => setProducedModalPath(f.path)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px',
                      background: '#FFFFFF', border: '1px solid transparent', borderRadius: 2,
                      fontFamily: 'var(--cv-mono)', fontSize: 11.5,
                      color: 'var(--cv-text)', width: '100%', textAlign: 'left', cursor: 'pointer',
                      transition: 'background 80ms, border-color 80ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FAF7EF';
                      e.currentTarget.style.borderColor = 'var(--cv-border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <span>📄</span>
                    <span style={{ color: 'var(--cv-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</span>
                    {f.size != null && (
                      <span style={{ color: 'var(--cv-text-dim)', fontSize: 10, flexShrink: 0 }}>
                        {f.size < 1024 ? `${f.size}B` : f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)}KB` : `${(f.size / 1024 / 1024).toFixed(1)}MB`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </DetailSection>
        )}
        <DetailSection label={`Checks (${task.checks.length})`}>
          {task.checks.length === 0 ? (
            <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>—</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {task.checks.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <StatusGlyph status={c.exit === 0 ? 'ok' : c.exit === null ? 'pending' : 'fail'} size={10} />
                  <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11.5, color: 'var(--cv-text)' }}>{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
        {task.spawnedChildren && task.spawnedChildren.length > 0 && (
          <DetailSection label={`Spawned children (${task.spawnedChildren.length})`}>
            <Chips items={task.spawnedChildren} />
          </DetailSection>
        )}
        {attempts.length > 0 && (
          <DetailSection label={`Attempts (${attempts.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...attempts].reverse().map((a, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 8px', background: '#F5F2EA', borderRadius: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontFamily: 'var(--cv-mono)', fontSize: 11 }}>
                    <span style={{ color: 'var(--cv-text-muted)' }}>#{a.attempt}</span>
                    <span style={{ color: 'var(--cv-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{a.status}</span>
                    <span style={{ color: 'var(--cv-text-dim)' }}>{(a.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                  {a.error && (
                    <div style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-status-fail)', wordBreak: 'break-word' }}>{a.error}</div>
                  )}
                </div>
              ))}
            </div>
          </DetailSection>
        )}
        {(() => {
          const entries = Object.entries(task.vars ?? {}).filter(([k]) => k !== 'group');
          if (entries.length === 0) return null;
          return (
            <DetailSection label="Vars">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {entries.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontFamily: 'var(--cv-mono)', fontSize: 11.5 }}>
                    <span style={{ color: 'var(--cv-text-dim)', flexShrink: 0 }}>{k}</span>
                    <span style={{ color: 'var(--cv-text)', wordBreak: 'break-word' }}>
                      {typeof v === 'string' ? v : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
              </div>
            </DetailSection>
          );
        })()}
        <CommentsSection comments={comments} onAdd={onAddComment} />
      </div>
    </aside>
    {producedModalPath && (
      <ArtifactPreviewModal
        playbookName={playbookName}
        path={producedModalPath}
        onClose={() => setProducedModalPath(null)}
      />
    )}
    </>
  );
}

function findTask(groups: TG[], id: string | null): PlaybookTask | null {
  if (!id) return null;
  function walk(tasks: PlaybookTask[]): PlaybookTask | null {
    for (const t of tasks) {
      if (t.id === id) return t;
      if (t.children) {
        const hit = walk(t.children);
        if (hit) return hit;
      }
    }
    return null;
  }
  for (const g of groups) {
    const hit = walk(g.tasks);
    if (hit) return hit;
  }
  return null;
}

const RUN_STATUS_STYLE: Record<PlaybookData['runStatus'], { bg: string; color: string; label: string; pulse?: boolean }> = {
  idle:     { bg: '#F5F2EA', color: 'var(--cv-text-muted)', label: 'idle' },
  running:  { bg: 'var(--cv-status-live)', color: '#FFFFFF', label: 'running', pulse: true },
  complete: { bg: 'var(--cv-status-ok)',   color: '#FFFFFF', label: 'complete' },
  error:    { bg: 'var(--cv-status-fail)', color: '#FFFFFF', label: 'failed' },
};

function RunStatusPill({ status }: { status: PlaybookData['runStatus'] }) {
  const s = RUN_STATUS_STYLE[status];
  return (
    <span
      data-runstatus={status}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '2px 8px', borderRadius: 10,
        background: s.bg, color: s.color,
        fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase',
      }}
    >
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.9 }} className={s.pulse ? 'cv-pulse' : ''} />
      {s.label}
    </span>
  );
}

export function PlaybookTab({ playbook, expanded, onToggle, onApprove, onChanges, warning, runActive, onRun, onStop, onReset, commentsByTask, onAddComment }: {
  playbook: PlaybookData;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onChanges: (id: string, data: { note: string; tags: string[] }) => void;
  warning?: { title: string; body: string } | null;
  runActive?: boolean;
  onRun?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  commentsByTask: Record<string, TaskComment[]>;
  onAddComment: (taskId: string, kind: 'comment' | 'rework', body: string) => Promise<void>;
}) {
  const pending = playbook.groups.flatMap(g => g.tasks).filter(t => t.review?.state === 'pending');
  const [queueIndex, setQueueIndex] = useState(0);
  const currentReview = pending[queueIndex] || pending[0];
  useEffect(() => { if (queueIndex >= pending.length && pending.length > 0) setQueueIndex(0); }, [pending.length, queueIndex]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = findTask(playbook.groups, selectedTaskId);
  const handleSelect = (id: string) => setSelectedTaskId(prev => (prev === id ? null : id));

  return (
    <div style={{ padding: '20px 32px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280, marginInline: 'auto' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Caption>playbook</Caption>
          <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, color: 'var(--cv-text-muted)' }}>· {playbook.runId.slice(0, 26)}</span>
          <RunStatusPill status={playbook.runStatus} />
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--cv-text)' }}>{playbook.name}</h1>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--cv-text-muted)', maxWidth: '64ch' }} dangerouslySetInnerHTML={{ __html: italicize(playbook.goal) }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <Caption>provider · {playbook.provider}</Caption>
          <span style={{ flex: 1 }} />
          {runActive ? (
            <>
              {onStop && (
                <button className="cv-btn cv-btn--ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={onStop}>◼ Stop</button>
              )}
              <button className="cv-btn cv-btn--primary" style={{ padding: '6px 14px', fontSize: 12.5 }} disabled>● Running</button>
            </>
          ) : playbook.runStatus === 'complete' || playbook.runStatus === 'error' ? (
            <>
              {onReset && (
                <button className="cv-btn cv-btn--ghost" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={onReset}>↻ Reset</button>
              )}
              {onRun && (
                <button className="cv-btn cv-btn--primary" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={onRun}>
                  ▶ {playbook.runStatus === 'complete' ? 'Run again' : 'Run'}
                </button>
              )}
            </>
          ) : (
            onRun && (
              <button className="cv-btn cv-btn--primary" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={onRun}>▶ Run</button>
            )
          )}
        </div>
      </header>
      {warning && (
        <aside style={{ background: 'var(--cv-review-changes-bg)', border: '1px solid #F3D89A', borderLeft: '3px solid var(--cv-status-delta)', borderRadius: 4, padding: '10px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 16, fontWeight: 600, color: '#92400E', marginTop: 2 }}>⚠</span>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5, color: '#7C3D08' }}>
            <strong style={{ fontWeight: 600 }}>{warning.title}</strong>
            <div style={{ marginTop: 4, color: '#92400E' }}>{warning.body}</div>
          </div>
        </aside>
      )}
      {currentReview && (
        <ReviewSpotlight task={currentReview} queueSize={pending.length} queueIndex={queueIndex}
          onApprove={onApprove} onChanges={onChanges}
          onNext={() => setQueueIndex(prev => (prev + 1) % pending.length)} />
      )}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, paddingLeft: 4 }}>
          <span style={{ fontFamily: 'var(--cv-sans)', fontSize: 15, fontWeight: 600, color: 'var(--cv-text)', letterSpacing: '-0.01em' }}>Tasks</span>
          <Caption>{playbook.counts.total} total · execution order</Caption>
        </div>
        <TaskTree
          groups={playbook.groups}
          expanded={expanded}
          selectedTaskId={selectedTaskId}
          onToggle={onToggle}
          onSelect={handleSelect}
        />
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            playbookName={playbook.name}
            comments={commentsByTask[selectedTask.id] ?? []}
            onAddComment={(kind, body) => onAddComment(selectedTask.id, kind, body)}
            onClose={() => setSelectedTaskId(null)}
          />
        )}
      </section>
    </div>
  );
}

export function JournalTab({ playbook }: { playbook: PlaybookData }) {
  const entries: [string, string, string][] = [
    ['14:33:08', 'info', 'run start · provider=' + playbook.provider],
    ['14:33:09', 'info', 'spawn 01-explore-sources'],
    ['14:34:20', 'check', '✓ 01-explore-sources · 2/2 checks pass'],
    ['14:34:21', 'info', 'spawn 02-tokens'],
    ['14:36:29', 'check', '✓ 02-tokens · 2/2 checks pass'],
    ['14:36:30', 'info', 'spawn 03-preview-cards (spawner)'],
    ['14:40:18', 'check', '✓ 03-preview-cards · 21 children complete'],
    ['14:40:19', 'info', 'spawn 04-define-type-scale'],
    ['14:41:07', 'human', '◆ 04-define-type-scale · awaiting human verdict'],
    ['14:41:21', 'human', '◆ 04b-define-color-tokens · awaiting human verdict'],
    ['14:41:34', 'human', '◆ 04c-confirm-italic-motif · awaiting human verdict'],
    ['14:41:35', 'info', 'spawn 05-components (spawner) · 8 children'],
  ];
  return (
    <div style={{ padding: '20px 32px', maxWidth: 1100, marginInline: 'auto' }}>
      <div className="journal-log">
        {entries.map(([ts, kind, msg], i) => (
          <div key={i} className={`journal-log__line journal-log__line--${kind}`}>
            <span className="journal-log__ts">{ts}</span>
            <span className={`journal-log__kind journal-log__kind--${kind}`}>
              {kind === 'check' ? '✓' : kind === 'human' ? '◆' : '·'}
            </span>
            <span className={`journal-log__msg${kind === 'human' ? ' journal-log__msg--human' : ''}`}>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FilesTab({ playbook }: { playbook: PlaybookData }) {
  const files: [string, string, string][] = [
    ['./colors_and_type.css', '20.3 KB', 'ok'],
    ['./preview/06-type-display.html', '1.4 KB', 'review'],
    ['./preview/07-type-headings.html', '1.7 KB', 'review'],
    ['./reference/converge-brand.json', '1.8 KB', 'ok'],
    ['./reference/converge-tokens.css', '3.7 KB', 'ok'],
  ];
  return (
    <div style={{ padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 1100, marginInline: 'auto' }}>
      <Caption>Outputs · {files.length} files</Caption>
      {files.map(([path, size, state]) => (
        <div key={path} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto auto', gap: 14, alignItems: 'center', background: '#FFFFFF', border: '1px solid var(--cv-border)', borderRadius: 2, padding: '14px 18px' }}>
          <StatusGlyph status={state === 'ok' ? 'ok' : 'awaiting-review'} />
          <code style={{ fontFamily: 'var(--cv-mono)', fontSize: 13 }}>{path}</code>
          <Caption>{size}</Caption>
          <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 10px', fontSize: 11.5 }}>open</button>
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   TimelineTab — beautiful vertical timeline of execution events
   ================================================================ */

interface TimelineEntry {
  id: string;
  ts: string;
  taskId: string | null;
  eventType: string;
  message: string;
  kind: 'execution' | 'task-start' | 'task-complete' | 'task-failed' | 'human' | 'check-pass' | 'check-fail' | 'sub';
}

interface TimelineGroup {
  id: string;
  taskId: string | null;
  title: string;
  startTs: string;
  endTs?: string;
  status: 'ok' | 'fail' | 'live' | 'info' | 'human';
  durationMs?: number;
  subs: TimelineEntry[];
}

function classifyEvent(ev: JournalEvent): TimelineEntry['kind'] {
  const t = (ev.eventType || (ev as any).type || '').toString();
  if (t.includes('EXECUTION_START') || t.includes('EXECUTION_END') || t.includes('SESSION')) return 'execution';
  if (t.includes('TASK_ATTEMPT_START') || t === 'task_start' || t.includes('TASK_START')) return 'task-start';
  if (t.includes('TASK_EXECUTION_COMPLETE') || t === 'task_complete' || t.includes('TASK_COMPLETE')) return 'task-complete';
  if (t.includes('TASK_FAILED') || t.includes('TASK_CRASH')) return 'task-failed';
  if (t.includes('AWAITING') || t.includes('HUMAN')) return 'human';
  if (t.includes('CHECK_PASS')) return 'check-pass';
  if (t.includes('CHECK_FAIL') || t.includes('CHECK_RUN')) return 'check-fail';
  return 'sub';
}

function extractTaskId(ev: JournalEvent): string | null {
  const e = ev as any;
  // Top-level taskId is the most common shape from converge journal events
  if (typeof e.taskId === 'string') return e.taskId;
  if (typeof e.task_id === 'string') return e.task_id;
  const m = ev.metadata as any;
  if (m?.taskId) return m.taskId;
  if (m?.task_id) return m.task_id;
  if (typeof ev.scope === 'string' && ev.scope && !ev.scope.includes('.')) return ev.scope;
  return null;
}

function fmtClock(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ts; }
}

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}

function groupEvents(events: JournalEvent[]): { groups: TimelineGroup[]; standalone: TimelineEntry[] } {
  const entries: TimelineEntry[] = events
    .filter(e => e && e.timestamp)
    .map((ev, i) => ({
      id: `${ev.timestamp}-${i}`,
      ts: ev.timestamp,
      taskId: extractTaskId(ev),
      eventType: (ev.eventType || (ev as any).type || '').toString(),
      message: ev.message || '',
      kind: classifyEvent(ev),
    }));

  const standalone: TimelineEntry[] = [];
  const groupMap = new Map<string, TimelineGroup>();
  let lastTaskId: string | null = null;

  for (const e of entries) {
    if (e.kind === 'execution') {
      standalone.push(e);
      lastTaskId = null;
      continue;
    }

    // Attribute orphan sub-events to last seen task
    const taskId = e.taskId || lastTaskId;
    if (!taskId) {
      standalone.push(e);
      continue;
    }

    if (e.kind === 'task-start' || e.kind === 'task-complete' || e.kind === 'task-failed') {
      lastTaskId = taskId;
    } else if (e.taskId) {
      lastTaskId = taskId;
    }

    let g = groupMap.get(taskId);
    if (!g) {
      g = {
        id: taskId,
        taskId,
        title: taskId,
        startTs: e.ts,
        status: 'info',
        subs: [],
      };
      groupMap.set(taskId, g);
    }

    if (e.kind === 'task-start') {
      g.startTs = e.ts;
      if (g.status === 'info') g.status = 'live';
    } else if (e.kind === 'task-complete') {
      g.endTs = e.ts;
      g.status = 'ok';
      g.durationMs = new Date(e.ts).getTime() - new Date(g.startTs).getTime();
    } else if (e.kind === 'task-failed') {
      g.endTs = e.ts;
      g.status = 'fail';
      g.durationMs = new Date(e.ts).getTime() - new Date(g.startTs).getTime();
    } else if (e.kind === 'human') {
      g.status = 'human';
    }

    g.subs.push(e);
  }

  return { groups: Array.from(groupMap.values()), standalone };
}

function statusGlyph(s: TimelineGroup['status']): { glyph: string; color: string } {
  switch (s) {
    case 'ok':    return { glyph: '✓', color: 'var(--cv-status-ok)' };
    case 'fail':  return { glyph: '✕', color: 'var(--cv-status-fail)' };
    case 'live':  return { glyph: '●', color: 'var(--cv-status-live)' };
    case 'human': return { glyph: '◆', color: 'var(--cv-status-delta)' };
    default:      return { glyph: '◯', color: 'var(--cv-text-dim)' };
  }
}

function subGlyph(k: TimelineEntry['kind']): { glyph: string; color: string } {
  switch (k) {
    case 'check-pass': return { glyph: '✓', color: 'var(--cv-status-ok)' };
    case 'check-fail': return { glyph: '✕', color: 'var(--cv-status-fail)' };
    case 'human':      return { glyph: '◆', color: 'var(--cv-status-delta)' };
    default:           return { glyph: '·', color: 'var(--cv-text-dim)' };
  }
}

function TimelineGroupCard({ group, expanded, onToggle }: {
  group: TimelineGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const sg = statusGlyph(group.status);
  const duration = group.durationMs ? fmtDuration(group.durationMs) : (group.status === 'live' ? '--' : '');

  return (
    <div className="timeline-row">
      <div className="timeline-rail">
        <span className="timeline-node" style={{ color: sg.color, borderColor: sg.color }}>
          {sg.glyph}
        </span>
      </div>
      <div className="timeline-card">
        <button
          type="button"
          className="timeline-card__head"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span className="timeline-card__ts">{fmtClock(group.startTs)}</span>
          <span className="timeline-card__title">{group.title}</span>
          <span className={`timeline-card__pill timeline-card__pill--${group.status}`}>
            {sg.glyph} {statusLabel(group.status === 'ok' ? 'pass' : group.status === 'fail' ? 'fail' : group.status === 'live' ? 'running' : group.status === 'human' ? 'awaiting-review' : 'pending')}
          </span>
          {duration && <span className="timeline-card__duration">{duration}</span>}
          <span className="timeline-card__chevron" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
        </button>
        {expanded && group.subs.length > 0 && (
          <div className="timeline-card__subs">
            {group.subs.map(s => {
              const sub = subGlyph(s.kind);
              return (
                <div key={s.id} className="timeline-sub">
                  <span className="timeline-sub__ts">{fmtClock(s.ts)}</span>
                  <span className="timeline-sub__glyph" style={{ color: sub.color }}>{sub.glyph}</span>
                  <span className="timeline-sub__type">{s.eventType}</span>
                  <span className="timeline-sub__msg">{s.message || ''}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StandaloneRow({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="timeline-row timeline-row--standalone">
      <div className="timeline-rail">
        <span className="timeline-node timeline-node--info">◉</span>
      </div>
      <div className="timeline-meta">
        <span className="timeline-card__ts">{fmtClock(entry.ts)}</span>
        <span className="timeline-card__type">{entry.eventType}</span>
        <span className="timeline-card__msg">{entry.message}</span>
      </div>
    </div>
  );
}

export function TimelineTab({ events }: { events: JournalEvent[] }) {
  const { groups, standalone } = useMemo(() => groupEvents(events), [events]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Build chronological mixed list
  const items = useMemo(() => {
    const mixed: Array<{ kind: 'group'; data: TimelineGroup } | { kind: 'standalone'; data: TimelineEntry }> = [];
    const standaloneByTs = new Map(standalone.map(s => [s.ts, s]));
    const groupByTs = new Map(groups.map(g => [g.startTs, g]));
    const all = [...standalone.map(s => ({ ts: s.ts, kind: 'standalone' as const, data: s })),
                 ...groups.map(g => ({ ts: g.startTs, kind: 'group' as const, data: g }))];
    all.sort((a, b) => a.ts.localeCompare(b.ts));
    return all;
  }, [groups, standalone]);

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const totalEvents = events.length;
  const totalTasks = groups.length;

  return (
    <div className="timeline-shell">
      <header className="timeline-shell__head">
        <Caption>Timeline</Caption>
        <span className="timeline-shell__meta">
          {totalEvents} {totalEvents === 1 ? 'event' : 'events'} · {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
        </span>
      </header>
      {items.length === 0 ? (
        <div className="timeline-shell__empty">
          <span>No events yet. They'll appear here as the playbook runs.</span>
        </div>
      ) : (
        <div className="timeline-list">
          {items.map((it, i) => {
            if (it.kind === 'standalone') {
              return <StandaloneRow key={`s-${i}`} entry={it.data} />;
            }
            return (
              <TimelineGroupCard
                key={it.data.id}
                group={it.data}
                expanded={expanded.has(it.data.id)}
                onToggle={() => toggle(it.data.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   LogsTab — raw text dump (concatenated log.log + live SSE stream)
   ================================================================ */

export function LogsTab({
  playbookName,
  liveLogs,
  live,
}: {
  playbookName: string;
  liveLogs: string;
  live: boolean;
}) {
  const [savedLogs, setSavedLogs] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    // Inject workspace header so the request resolves to the right project
    const headers: HeadersInit = (() => {
      try {
        const cfg = JSON.parse(localStorage.getItem('converge-studio-config') || '{}');
        const ws = (cfg.workspaces || []).find((w: any) => w.id === cfg.currentWorkspaceId);
        return ws?.path ? { 'X-Converge-Workspace': ws.path } : {};
      } catch { return {}; }
    })();
    fetch(`/api/playbooks/${encodeURIComponent(playbookName)}/logs`, { headers })
      .then(r => r.text())
      .then(text => { if (!cancelled) setSavedLogs(text); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [playbookName, live]);

  const combined = liveLogs ? (savedLogs ? `${savedLogs}\n--- live ---\n${liveLogs}` : liveLogs) : savedLogs;

  useEffect(() => {
    if (!autoScroll) return;
    const el = preRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [combined, autoScroll]);

  function onScroll() {
    const el = preRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setAutoScroll(atBottom);
  }

  function copyAll() {
    navigator.clipboard?.writeText(combined).catch(() => {});
  }

  return (
    <div className="logs-shell">
      <header className="logs-shell__head">
        <Caption>Logs{live ? ' · live' : ''}</Caption>
        <span className="logs-shell__meta">{combined.split('\n').length} lines</span>
        <span style={{ flex: 1 }} />
        <label className="logs-shell__toggle">
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} />
          Auto-scroll
        </label>
        <button type="button" className="cv-btn cv-btn--ghost logs-shell__btn" onClick={copyAll}>
          Copy
        </button>
      </header>
      <pre ref={preRef} className="logs-shell__body" onScroll={onScroll}>
        {combined || (live ? 'Waiting for output…' : 'No logs yet.')}
      </pre>
    </div>
  );
}
