import React, { useState, useEffect } from 'react';
import type { PlaybookData, PlaybookTask, TaskGroup as TG } from '../playbook-data';
import { StatusGlyph, ReviewPill, Pill, Caption, MetaCell, statusLabel, emphKeywords, italicize } from './primitives';

export function WorkspaceTabs({ tabs, activeId, onSelect, awaitingCount }: {
  tabs: { id: string; label: string; glyph: string }[];
  activeId: string;
  onSelect: (id: string) => void;
  awaitingCount: number;
}) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="cv-btn cv-btn--ghost" style={{ padding: '5px 10px', fontSize: 12 }}>↗ Share</button>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--cv-text)', color: 'var(--cv-bg)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--cv-sans)', fontWeight: 600, fontSize: 12,
        }}>M</div>
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
              <button onClick={() => onApprove(task.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--cv-status-ok)', border: '1px solid var(--cv-status-ok)', color: '#FFF', borderRadius: 2, fontFamily: 'var(--cv-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>👍 Looks good</button>
              <button onClick={() => setOpenForm(!openForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: openForm ? '#FDE8B9' : 'var(--cv-review-changes-bg)', border: '1px solid #F3D89A', color: '#92400E', borderRadius: 2, fontFamily: 'var(--cv-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>💬 Needs work…</button>
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

function TaskRow({ task, expanded, onToggle }: {
  task: PlaybookTask; expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const isExpanded = expanded.has(task.id);
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = task.outputs.length > 0 || task.checks.length > 0;

  return (
    <div style={{ borderBottom: '1px solid var(--cv-border)' }}>
      <button onClick={() => onToggle(task.id)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        width: '100%', padding: '7px 14px',
        background: isExpanded ? '#FAFAF7' : '#FFFFFF', border: 'none',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--cv-sans)', color: 'var(--cv-text)', transition: 'background 120ms ease',
      }}>
        <span style={{ width: 14, color: 'var(--cv-text-dim)', fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 600, transition: 'transform 160ms ease', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>›</span>
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{task.title}</span>
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {task.mode}{task.duration ? ` · ${task.duration}` : ''}{task.progress ? ` · ${task.progress.done}/${task.progress.total}` : ''}
        </span>
        <StatusGlyph status={task.status} size={12} />
      </button>
      {isExpanded && (
        <div style={{ padding: '8px 14px 10px', paddingLeft: 32, borderTop: '1px solid var(--cv-border)', background: '#FAFAF7' }}>
          <p style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 12, lineHeight: 1.5, color: 'var(--cv-text-muted)', maxWidth: '64ch' }} dangerouslySetInnerHTML={{ __html: emphKeywords(task.summary) }} />
          {hasDetail && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowDetail(!showDetail); }}
              style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, fontFamily: 'var(--cv-sans)', fontSize: 11, color: 'var(--cv-accent-warm)', cursor: 'pointer' }}
            >{showDetail ? '‹ less' : 'view more →'}</button>
          )}
          {showDetail && (
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {task.outputs.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', flexShrink: 0 }}>outputs</span>
                  <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-muted)' }}>{task.outputs.join(', ')}</span>
                </div>
              )}
              {task.checks.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cv-text-dim)', flexShrink: 0 }}>checks</span>
                  <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-muted)' }}>{task.checks.map(c => c.label).join(' · ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: '#FFFFFF', border: '1px solid var(--cv-border)', borderRadius: 4, overflow: 'hidden' as const, boxShadow: '0 1px 3px rgba(17,24,39,0.06), 0 1px 2px rgba(17,24,39,0.04)' };

function GroupLabel({ label, sublabel, count }: { label: string; sublabel: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 4 }}>
        <Caption>{label}</Caption>
        <span style={{ fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 600, color: 'var(--cv-text)' }}>{sublabel}</span>
      </div>
      <Caption>{count} {count === 1 ? 'task' : 'tasks'}</Caption>
    </div>
  );
}

function SubtaskLabel({ parentTitle, count }: { parentTitle: string; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingLeft: 4 }}>
        <Caption>↳ subtasks</Caption>
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, fontWeight: 500, color: 'var(--cv-text-muted)' }}>{parentTitle}</span>
      </div>
      <Caption>{count} {count === 1 ? 'task' : 'tasks'}</Caption>
    </div>
  );
}

function TaskListFlat({ tasks, expanded, onToggle }: {
  tasks: PlaybookTask[]; expanded: Set<string>; onToggle: (id: string) => void;
}) {
  const segments: { before: PlaybookTask[]; childGroup: { parentTitle: string; children: PlaybookTask[] } | null }[] = [];
  let currentBatch: PlaybookTask[] = [];

  for (const task of tasks) {
    currentBatch.push(task);
    const hasExpandedChildren = expanded.has(task.id) && task.children && task.children.length > 0;
    if (hasExpandedChildren) {
      segments.push({ before: currentBatch, childGroup: { parentTitle: task.title, children: task.children! } });
      currentBatch = [];
    }
  }
  if (currentBatch.length > 0) {
    segments.push({ before: currentBatch, childGroup: null });
  }

  return (
    <>
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          <div style={cardStyle}>
            {seg.before.map(t => <TaskRow key={t.id} task={t} expanded={expanded} onToggle={onToggle} />)}
          </div>
          {seg.childGroup && (
            <div style={{ paddingLeft: 16 }}>
              <TaskListFlat tasks={seg.childGroup.children} expanded={expanded} onToggle={onToggle} />
            </div>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

function TaskGroupSection({ label, sublabel, tasks, expanded, onToggle }: {
  label: string; sublabel: string; tasks: PlaybookTask[]; expanded: Set<string>; onToggle: (id: string) => void;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <GroupLabel label={label} sublabel={sublabel} count={tasks.length} />
      <TaskListFlat tasks={tasks} expanded={expanded} onToggle={onToggle} />
    </section>
  );
}

export function PlaybookTab({ playbook, expanded, onToggle, onApprove, onChanges, warning }: {
  playbook: PlaybookData;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onApprove: (id: string) => void;
  onChanges: (id: string, data: { note: string; tags: string[] }) => void;
  warning?: { title: string; body: string } | null;
}) {
  const pending = playbook.groups.flatMap(g => g.tasks).filter(t => t.review?.state === 'pending');
  const [queueIndex, setQueueIndex] = useState(0);
  const currentReview = pending[queueIndex] || pending[0];
  useEffect(() => { if (queueIndex >= pending.length && pending.length > 0) setQueueIndex(0); }, [pending.length, queueIndex]);

  return (
    <div style={{ padding: '20px 32px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100, marginInline: 'auto' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Caption>playbook</Caption>
          <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, color: 'var(--cv-text-muted)' }}>· {playbook.runId.slice(0, 26)}</span>
        </div>
        <h1 style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--cv-text)' }}>{playbook.name}</h1>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--cv-text-muted)', maxWidth: '64ch' }} dangerouslySetInnerHTML={{ __html: italicize("Build a Converge-flavored design system from upstream sources. Tasks declare their *outputs* and the shell *checks* that prove them; the runner converges when every output verifies and every check exits 0.") }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8 }}>
          <Caption>provider · {playbook.provider}</Caption>
          <span style={{ flex: 1 }} />
          <button className="cv-btn cv-btn--ghost" style={{ padding: '6px 12px', fontSize: 12.5 }}>◼ Stop</button>
          <button className="cv-btn cv-btn--primary" style={{ padding: '6px 14px', fontSize: 12.5 }}>● Running</button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {playbook.groups.map((g, i) => (
            <TaskGroupSection
              key={g.id}
              label={`Step ${String(i + 1).padStart(2, '0')}`}
              sublabel={g.title}
              tasks={g.tasks}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
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
      <div style={{ background: 'var(--cv-bg-code)', color: '#F8FAFC', border: '1px solid #1E293B', borderRadius: 4, padding: '14px 18px', fontFamily: 'var(--cv-mono)', fontSize: 12.5, lineHeight: 1.7 }}>
        {entries.map(([ts, kind, msg], i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 18px 1fr', gap: 12, alignItems: 'baseline' }}>
            <span style={{ color: '#64748B' }}>{ts}</span>
            <span style={{ color: kind === 'check' ? '#10B981' : kind === 'human' ? '#F59E0B' : '#94A3B8', fontWeight: 600 }}>{kind === 'check' ? '✓' : kind === 'human' ? '◆' : '·'}</span>
            <span style={{ color: kind === 'human' ? '#F59E0B' : '#CBD5E1' }}>{msg}</span>
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
