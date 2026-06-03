// =============================================================
// Converge UI Kit — workspace.jsx
// Tabbed right-hand workspace.
//
// Playbook tab structure (per design):
//   1. Playbook title + description
//   2. Warning panel (optional)
//   3. Needs review — ONE card at a time, with stacked background cards
//      indicating other pending reviews
//   4. Tasks — grouped by execution order
// =============================================================

// ---- top tab strip ------------------------------------------

const WorkspaceTabs = ({ tabs, activeId, onSelect, awaitingCount }) => (
  <header style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 16,
    padding: '0 32px',
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
              padding: '14px 16px 13px',
              border: 'none',
              background: 'transparent',
              borderBottom: active ? '2px solid var(--cv-text)' : '2px solid transparent',
              fontFamily: 'var(--cv-sans)',
              fontSize: 13.5,
              fontWeight: active ? 600 : 500,
              color: active ? 'var(--cv-text)' : 'var(--cv-text-muted)',
              cursor: 'pointer',
              transition: 'color 120ms ease, border-color 120ms ease',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--cv-text)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--cv-text-muted)'; }}
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

// ============================================================
// 3. NEEDS REVIEW — one card with stacked background cards
// ============================================================

const ReviewSpotlight = ({ task, queueSize, queueIndex, onApprove, onChanges, onReject, onNext }) => {
  const [openForm, setOpenForm] = useState(null);  // 'changes' | 'reject' | null
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);

  const submit = () => {
    if (openForm === 'changes') onChanges(task.id, { note, tags });
    if (openForm === 'reject')  onReject(task.id, { note, tags });
    setOpenForm(null); setNote(''); setTags([]);
  };

  const tagOptions = ['spec-mismatch', 'check-too-loose', 'wrong-output-path', 'style-only'];
  const toggleTag = (t) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  // Background "stack" cards. Render up to 2 ghost cards behind.
  const stackBehind = Math.max(0, Math.min(2, queueSize - queueIndex - 1));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <Caption color="#92400E">◆ Needs review{queueSize > 1 ? ` · ${queueIndex + 1} of ${queueSize}` : ''}</Caption>
        {queueSize > 1 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onNext}>
              Skip · next →
            </button>
          </div>
        )}
      </div>

      {/* Stack wrapper — relative so the back cards can stack underneath */}
      <div style={{ position: 'relative', marginBottom: stackBehind * 8 }}>
        {/* Background stack cards */}
        {[...Array(stackBehind)].map((_, i) => {
          const depth = i + 1;
          return (
            <div key={i} style={{
              position: 'absolute',
              top: depth * 8,
              left: depth * 8,
              right: depth * 8,
              bottom: -depth * 8,
              background: '#FFFFFF',
              border: '1px solid var(--cv-border)',
              borderRadius: 6,
              opacity: 1 - depth * 0.25,
              zIndex: 0,
              pointerEvents: 'none',
            }} aria-hidden="true" />
          );
        })}

        {/* Foreground card */}
        <article style={{
          position: 'relative',
          zIndex: 1,
          background: '#FFFFFF',
          border: '1px solid var(--cv-border)',
          borderLeft: '3px solid var(--cv-status-delta)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: 'var(--cv-shadow-pop)',
        }}>
          {/* Header */}
          <header style={{ padding: '24px 32px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
              <Pill>{task.mode}</Pill>
              <ReviewPill state="changes">◆ awaiting human</ReviewPill>
              <span style={{ flex: 1 }} />
              <Caption>duration · {task.duration}</Caption>
            </div>
            <h2 className="cv-h3" style={{
              margin: 0, marginBottom: 10,
              fontFamily: 'var(--cv-mono)', fontSize: 22, fontWeight: 500, letterSpacing: '-0.01em',
              color: 'var(--cv-text)',
            }}>{task.title}</h2>
            <p style={{
              margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 15, lineHeight: 1.6,
              color: 'var(--cv-text-muted)',
              maxWidth: '64ch',
            }}
              dangerouslySetInnerHTML={{
                __html: task.summary.replace(
                  /\b(Inter|400|spec\.json|colors_and_type\.css|brand\.json|reusable, shareable|verifiable|measurable|concrete|brand motif|human verdict|Crimson Pro|terracotta|italic emphasis|italic-emphasis)\b/g,
                  '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>'
                ),
              }}
            />
          </header>

          {/* Outputs + checks preview */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24,
            padding: '0 32px 24px',
          }}>
            {task.outputs && task.outputs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Caption>Outputs · {task.outputs.length}</Caption>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {task.outputs.map((p, i) => (
                    <code key={i} style={{
                      fontFamily: 'var(--cv-mono)', fontSize: 12.5,
                      background: '#FAFAF7', border: '1px solid var(--cv-border)',
                      padding: '6px 10px', borderRadius: 2,
                    }}>{p}</code>
                  ))}
                </div>
              </div>
            )}

            {task.checks && task.checks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Caption>Checks · {task.checks.length}</Caption>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {task.checks.map((c, i) => {
                    const passed = c.exit === 0;
                    return (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 10,
                        alignItems: 'center', padding: '7px 10px',
                        background: '#FAFAF7', border: '1px solid var(--cv-border)',
                        borderRadius: 2,
                      }}>
                        <StatusGlyph status={passed ? 'ok' : 'fail'} />
                        <span style={{ fontSize: 12.5 }}>{c.label}</span>
                        <Caption color={passed ? 'var(--cv-status-ok)' : 'var(--cv-status-fail)'}>
                          {passed ? 'pass' : 'fail'}
                        </Caption>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action footer */}
          <footer style={{
            background: '#FAFAF7',
            borderTop: '1px solid var(--cv-border)',
            padding: '20px 32px',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            {/* Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Caption>Submit verdict</Caption>
              <span style={{ flex: 1 }} />
              <button
                onClick={() => onApprove(task.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px',
                  background: 'var(--cv-status-ok)',
                  border: '1px solid var(--cv-status-ok)',
                  color: '#FFFFFF',
                  borderRadius: 2,
                  fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#0EA372'; e.currentTarget.style.borderColor = '#0EA372'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--cv-status-ok)'; e.currentTarget.style.borderColor = 'var(--cv-status-ok)'; }}
              >👍 Looks good · approve</button>
              <button
                onClick={() => setOpenForm(openForm === 'changes' ? null : 'changes')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px',
                  background: openForm === 'changes' ? '#FDE8B9' : 'var(--cv-review-changes-bg)',
                  border: '1px solid #F3D89A',
                  color: '#92400E',
                  borderRadius: 2,
                  fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >💬 Needs work…</button>
              <button
                onClick={() => setOpenForm(openForm === 'reject' ? null : 'reject')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '9px 16px',
                  background: openForm === 'reject' ? '#F9D4D9' : 'transparent',
                  border: '1px solid #F6BCC2',
                  color: '#9F1239',
                  borderRadius: 2,
                  fontFamily: 'var(--cv-sans)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >✕ Reject</button>
            </div>

            {/* Inline form */}
            {openForm && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder={openForm === 'changes'
                    ? "What needs to change? Feeds back into the runner as additional context on respawn."
                    : "Why is this task wrong? The runner will mark it terminally failed and propagate."
                  }
                  style={{
                    resize: 'vertical',
                    padding: '10px 12px',
                    fontFamily: 'var(--cv-sans)', fontSize: 13.5, lineHeight: 1.55,
                    border: '1px solid var(--cv-border-strong)', borderRadius: 2,
                    background: '#FFFFFF', color: 'var(--cv-text)',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Caption>Tags</Caption>
                  {tagOptions.map(t => (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      style={{
                        padding: '3px 8px',
                        fontFamily: 'var(--cv-mono)', fontSize: 10.5, fontWeight: 500,
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        background: tags.includes(t) ? 'var(--cv-text)' : '#FFFFFF',
                        color: tags.includes(t) ? 'var(--cv-bg)' : 'var(--cv-text-muted)',
                        border: `1px solid ${tags.includes(t) ? 'var(--cv-text)' : 'var(--cv-border-strong)'}`,
                        borderRadius: 2, cursor: 'pointer',
                      }}
                    >{tags.includes(t) ? '✓ ' : ''}{t}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Caption>writes to .converge/journal</Caption>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setOpenForm(null)} className="cv-btn cv-btn--ghost" style={{ padding: '5px 12px', fontSize: 12.5 }}>Cancel</button>
                    <button
                      onClick={submit}
                      disabled={!note.trim()}
                      style={{
                        padding: '5px 14px', fontSize: 12.5, fontWeight: 600,
                        opacity: note.trim() ? 1 : 0.5, cursor: note.trim() ? 'pointer' : 'not-allowed',
                        background: openForm === 'changes' ? '#92400E' : '#9F1239',
                        borderColor: openForm === 'changes' ? '#92400E' : '#9F1239',
                        color: '#FFFFFF', border: '1px solid', borderRadius: 2,
                        fontFamily: 'var(--cv-sans)',
                      }}
                    >Submit {openForm === 'changes' ? 'changes' : 'rejection'}</button>
                  </div>
                </div>
              </div>
            )}
          </footer>
        </article>
      </div>
    </section>
  );
};

// ============================================================
// 4. TASKS — groups follow execution order
// ============================================================

const TaskCardRow = ({ task, depth, expanded, onToggle }) => {
  const isExpanded = expanded.has(task.id);
  const awaiting = task.review && task.review.state === 'pending';

  return (
    <div style={{ borderBottom: '1px solid var(--cv-border)' }}>
      <button
        onClick={() => onToggle(task.id)}
        style={{
          display: 'grid',
          gridTemplateColumns: '18px 20px 1fr auto auto',
          gap: 14,
          alignItems: 'center',
          width: '100%',
          padding: '18px 26px',
          paddingLeft: 26 + depth * 22,
          background: isExpanded ? '#FAFAF7' : '#FFFFFF',
          border: 'none',
          borderLeft: awaiting ? '2px solid var(--cv-status-delta)' : '2px solid transparent',
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'var(--cv-sans)',
          color: 'var(--cv-text)',
          transition: 'background 120ms ease',
        }}
        onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#FAFAF7'; }}
        onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#FFFFFF'; }}
      >
        <span style={{
          width: 18, color: 'var(--cv-text-dim)',
          fontFamily: 'var(--cv-mono)', fontSize: 13, fontWeight: 600,
          transition: 'transform 160ms ease, color 120ms ease',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>›</span>
        <StatusGlyph status={task.status} />
        <span style={{
          fontFamily: 'var(--cv-mono)', fontSize: 13, fontWeight: 500,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.title}</span>
        <span style={{
          fontFamily: 'var(--cv-mono)', fontSize: 10.5, fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cv-text-dim)',
          whiteSpace: 'nowrap',
        }}>
          {task.mode || ''}
          {task.mode && task.duration ? <> <span style={{ color: 'var(--cv-text)' }}>·</span> {task.duration}</> : null}
          {task.progress ? <> <span style={{ color: 'var(--cv-text)' }}>·</span> {task.progress.done}/{task.progress.total}</> : null}
        </span>
        {awaiting && <ReviewPill state="changes">◆ review</ReviewPill>}
        {task.review && task.review.state === 'approved' && <ReviewPill state="approved">✓ approved</ReviewPill>}
        {!awaiting && !(task.review && task.review.state === 'approved') && <span style={{ width: 1 }} />}
      </button>

      {isExpanded && (
        <div style={{ background: '#FAFAF7' }}>
          <div style={{
            padding: '26px 36px 28px',
            paddingLeft: 72 + depth * 22,
            borderTop: '1px solid var(--cv-border)',
            display: 'flex', flexDirection: 'column', gap: 24,
          }}>
            <p style={{
              margin: 0,
              fontFamily: 'var(--cv-sans)', fontSize: 14, lineHeight: 1.6,
              color: 'var(--cv-text-muted)', maxWidth: 64 + 'ch',
            }}
              dangerouslySetInnerHTML={{
                __html: task.summary.replace(
                  /\b(spec\.json|colors_and_type\.css|brand\.json|reusable, shareable|verifiable|measurable|concrete|400|brand motif|human verdict|Crimson Pro|terracotta|italic emphasis|italic-emphasis)\b/g,
                  '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>'
                ),
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 24 }}>
              {task.outputs && <MetaCell label="Outputs" value={`${task.outputs.length} declared`} />}
              {task.checks && task.checks.length > 0 && <MetaCell label="Checks" value={`${task.checks.length} declared`} />}
              <MetaCell label="Status" value={statusLabel(task.status)} />
              {task.duration && <MetaCell label="Duration" value={task.duration} />}
            </div>

            {task.outputs && task.outputs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Caption>Outputs</Caption>
                {task.outputs.map((p, i) => (
                  <code key={i} style={{
                    fontFamily: 'var(--cv-mono)', fontSize: 12.5,
                    background: '#FFFFFF', border: '1px solid var(--cv-border)',
                    padding: '7px 10px', borderRadius: 2,
                  }}>{p}</code>
                ))}
              </div>
            )}

            {task.checks && task.checks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Caption>Checks</Caption>
                {task.checks.map((c, i) => {
                  const passed = c.exit === 0;
                  const running = c.exit === null;
                  return (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 10,
                      alignItems: 'center', padding: '8px 12px',
                      background: '#FFFFFF', border: '1px solid var(--cv-border)',
                      borderRadius: 2,
                    }}>
                      <StatusGlyph status={running ? 'live' : (passed ? 'ok' : 'fail')} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 12.5 }}>{c.label}</span>
                        <code style={{
                          fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>$ {c.cmd}</code>
                      </div>
                      <Caption color={passed ? 'var(--cv-status-ok)' : running ? 'var(--cv-status-delta)' : 'var(--cv-status-fail)'}>
                        {c.actual ? c.actual : (passed ? 'pass · 0' : running ? 'running' : 'fail · ' + c.exit)}
                      </Caption>
                    </div>
                  );
                })}
              </div>
            )}

            {task.review && task.review.state === 'approved' && task.review.note && (
              <div style={{
                background: 'var(--cv-review-approved-bg)',
                border: '1px solid #A7E9CB', borderLeft: '3px solid var(--cv-status-ok)',
                borderRadius: 2, padding: '12px 14px',
                fontSize: 13, lineHeight: 1.55, color: '#065F46',
              }}>
                <Caption color="#047857">Verdict · approved · {task.review.reviewer}</Caption>
                <div style={{ marginTop: 4 }}>{task.review.note}</div>
              </div>
            )}

            {task.children && task.children.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Caption>Spawned children · {task.children.length}</Caption>
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--cv-border)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}>
                  {task.children.map(child => (
                    <TaskCardRow
                      key={child.id} task={child} depth={depth + 1}
                      expanded={expanded} onToggle={onToggle}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MetaCell = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <Caption>{label}</Caption>
    <span style={{
      fontFamily: 'var(--cv-mono)', fontSize: 13, color: 'var(--cv-text)',
    }}>{value}</span>
  </div>
);

const TaskGroup = ({ group, index, expanded, onToggle }) => (
  <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingLeft: 4 }}>
        <Caption>Step {String(index + 1).padStart(2, '0')}</Caption>
        <span style={{
          fontFamily: 'var(--cv-sans)', fontSize: 15, fontWeight: 600, color: 'var(--cv-text)',
        }}>{group.title}</span>
      </div>
      <Caption>{group.summary}</Caption>
    </div>
    <div style={{
      background: '#FFFFFF',
      border: '1px solid var(--cv-border)',
      borderRadius: 4,
      overflow: 'hidden',
    }}>
      {group.tasks.map(t => (
        <TaskCardRow
          key={t.id} task={t} depth={0}
          expanded={expanded} onToggle={onToggle}
        />
      ))}
    </div>
  </section>
);

// ============================================================
// PLAYBOOK TAB — title · description · warning · review · tasks
// ============================================================

const PlaybookTab = ({ playbook, expanded, onToggle, onApprove, onChanges, onReject, warning }) => {
  // Pending reviews queue
  const pending = playbook.groups
    .flatMap(g => g.tasks)
    .filter(t => t.review && t.review.state === 'pending');
  const [queueIndex, setQueueIndex] = useState(0);
  const currentReview = pending[queueIndex] || pending[0];

  // If queue shrinks below current index, snap back
  React.useEffect(() => {
    if (queueIndex >= pending.length && pending.length > 0) setQueueIndex(0);
  }, [pending.length]);

  const nextInQueue = () => {
    setQueueIndex(prev => (prev + 1) % pending.length);
  };

  return (
    <div style={{
      padding: '56px 64px 140px',
      display: 'flex', flexDirection: 'column', gap: 56,
      maxWidth: 1100, marginInline: 'auto',
    }}>
      {/* === 1. Title + description === */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Caption>playbook</Caption>
          <span style={{
            fontFamily: 'var(--cv-mono)', fontSize: 12, color: 'var(--cv-text-muted)',
          }}>· {playbook.runId.slice(0, 26)}</span>
        </div>
        <h1 className="cv-h2" style={{ margin: 0, fontSize: 44 }}>
          design-system-build
        </h1>
        <p style={{
          margin: 0, fontSize: 16, lineHeight: 1.6, color: 'var(--cv-text-muted)', maxWidth: '64ch',
        }}
          dangerouslySetInnerHTML={{
            __html: (
              "Build a Converge-flavored design system from upstream sources. Tasks declare their *outputs* and the shell *checks* that prove them; the runner converges when every output verifies and every check exits 0."
            ).replace(
              /\*([^*]+)\*/g,
              '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>'
            ),
          }}
        />

        {/* Status row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          paddingTop: 8,
        }}>
          <Caption>
            <span style={{ color: 'var(--cv-status-ok)' }}>✓ {playbook.counts.ok}</span>{' '}
            <span style={{ color: 'var(--cv-text)' }}>·</span>{' '}
            <span style={{ color: 'var(--cv-status-live)' }}>● {playbook.counts.live}</span>{' '}
            <span style={{ color: 'var(--cv-text)' }}>·</span>{' '}
            <span style={{ color: 'var(--cv-status-delta)' }}>Δ {playbook.counts.delta}</span>{' '}
            <span style={{ color: 'var(--cv-text)' }}>·</span>{' '}
            <span style={{ color: 'var(--cv-status-fail)' }}>✕ {playbook.counts.fail}</span>
          </Caption>
          <span style={{ width: 1, height: 14, background: 'var(--cv-border)' }} />
          <Caption>provider · {playbook.provider}</Caption>
          <span style={{ flex: 1 }} />
          <button className="cv-btn cv-btn--ghost" style={{ padding: '6px 12px', fontSize: 12.5 }}>◼ Stop</button>
          <button className="cv-btn cv-btn--primary" style={{ padding: '6px 14px', fontSize: 12.5 }}>● Running</button>
        </div>
      </header>

      {/* === 2. Warning panel (optional) === */}
      {warning && (
        <aside style={{
          background: 'var(--cv-review-changes-bg)',
          border: '1px solid #F3D89A',
          borderLeft: '3px solid var(--cv-status-delta)',
          borderRadius: 4,
          padding: '18px 24px',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <span style={{
            fontFamily: 'var(--cv-mono)', fontSize: 16, fontWeight: 600,
            color: '#92400E', marginTop: 2,
          }}>⚠</span>
          <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.55, color: '#7C3D08' }}>
            <strong style={{ fontWeight: 600 }}>{warning.title}</strong>
            <div style={{ marginTop: 4, color: '#92400E' }}>{warning.body}</div>
          </div>
        </aside>
      )}

      {/* === 3. Needs review (one card at a time + stacked back cards) === */}
      {currentReview && (
        <ReviewSpotlight
          task={currentReview}
          queueSize={pending.length}
          queueIndex={queueIndex}
          onApprove={onApprove}
          onChanges={onChanges}
          onReject={onReject}
          onNext={nextInQueue}
        />
      )}

      {/* === 4. Tasks (groups in execution order) === */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, paddingLeft: 4 }}>
          <span style={{
            fontFamily: 'var(--cv-sans)', fontSize: 20, fontWeight: 600,
            color: 'var(--cv-text)', letterSpacing: '-0.01em',
          }}>Tasks</span>
          <Caption>{playbook.counts.total} total · execution order</Caption>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {playbook.groups.map((g, i) => (
            <TaskGroup
              key={g.id} group={g} index={i}
              expanded={expanded} onToggle={onToggle}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

// ============================================================
// Other tabs
// ============================================================

const JournalTab = ({ playbook }) => (
  <div style={{ padding: '40px 64px', maxWidth: 1100, marginInline: 'auto' }}>
    <div style={{
      background: 'var(--cv-bg-code)', color: '#F8FAFC',
      border: '1px solid #1E293B', borderRadius: 4,
      padding: '20px 24px',
      fontFamily: 'var(--cv-mono)', fontSize: 12.5, lineHeight: 1.85,
    }}>
      {[
        ['14:33:08', 'info',  'run start · provider=' + playbook.provider],
        ['14:33:09', 'info',  'spawn 01-explore-sources'],
        ['14:34:20', 'check', '✓ 01-explore-sources · 2/2 checks pass'],
        ['14:34:21', 'info',  'spawn 02-tokens'],
        ['14:36:29', 'check', '✓ 02-tokens · 2/2 checks pass'],
        ['14:36:30', 'info',  'spawn 03-preview-cards (spawner)'],
        ['14:40:18', 'check', '✓ 03-preview-cards · 21 children complete'],
        ['14:40:19', 'info',  'spawn 04-define-type-scale'],
        ['14:41:07', 'human', '◆ 04-define-type-scale · awaiting human verdict'],
        ['14:41:21', 'human', '◆ 04b-define-color-tokens · awaiting human verdict'],
        ['14:41:34', 'human', '◆ 04c-confirm-italic-motif · awaiting human verdict'],
        ['14:41:35', 'info',  'spawn 05-components (spawner) · 8 children'],
      ].map(([ts, kind, msg], i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '70px 18px 1fr', gap: 12, alignItems: 'baseline',
        }}>
          <span style={{ color: '#64748B' }}>{ts}</span>
          <span style={{
            color: kind === 'check' ? '#10B981' : kind === 'human' ? '#F59E0B' : '#94A3B8',
            fontWeight: 600,
          }}>{kind === 'check' ? '✓' : kind === 'human' ? '◆' : '·'}</span>
          <span style={{ color: kind === 'human' ? '#F59E0B' : '#CBD5E1' }}>{msg}</span>
        </div>
      ))}
    </div>
  </div>
);

const FilesTab = ({ playbook }) => (
  <div style={{ padding: '40px 64px', display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1100, marginInline: 'auto' }}>
    <Caption>Outputs · 5 files</Caption>
    {[
      ['./colors_and_type.css', '20.3 KB', 'ok'],
      ['./preview/06-type-display.html', '1.4 KB', 'review'],
      ['./preview/07-type-headings.html', '1.7 KB', 'review'],
      ['./reference/converge-brand.json', '1.8 KB', 'ok'],
      ['./reference/converge-tokens.css', '3.7 KB', 'ok'],
    ].map(([path, size, state]) => (
      <div key={path} style={{
        display: 'grid', gridTemplateColumns: '18px 1fr auto auto', gap: 14, alignItems: 'center',
        background: '#FFFFFF', border: '1px solid var(--cv-border)', borderRadius: 2,
        padding: '14px 18px',
      }}>
        <StatusGlyph status={state === 'ok' ? 'ok' : 'awaiting-review'} />
        <code style={{ fontFamily: 'var(--cv-mono)', fontSize: 13 }}>{path}</code>
        <Caption>{size}</Caption>
        <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 10px', fontSize: 11.5 }}>open</button>
      </div>
    ))}
  </div>
);

Object.assign(window, {
  WorkspaceTabs, PlaybookTab, JournalTab, FilesTab,
  TaskGroup, TaskCardRow, ReviewSpotlight, MetaCell,
});
