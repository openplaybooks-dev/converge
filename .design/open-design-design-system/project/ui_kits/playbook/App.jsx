// =============================================================
// Converge UI Kit — App.jsx
// Chat-on-left + tabbed-workspace-on-right shell. Owns the
// playbook state, the chat thread, the expanded-set, and the
// verdict-submission state machine.
// =============================================================

const { useState, useEffect } = React;

const TABS = [
  { id: 'playbook', label: 'Playbook',     glyph: '◇' },
  { id: 'journal',  label: 'Run journal',  glyph: '◉' },
  { id: 'files',    label: 'Files',        glyph: '›' },
];

const App = () => {
  const [playbook, setPlaybook] = useState(window.PLAYBOOK_DATA);
  const [chat, setChat] = useState(playbook.chat);
  // Start with the awaiting-review task expanded so the reviewer lands on it.
  const [expanded, setExpanded] = useState(new Set(['04-define-type-scale']));
  const [activeTab, setActiveTab] = useState('playbook');
  const [toast, setToast] = useState(null);

  const onToggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ----- find any task in the grouped tree -----
  const findTask = (tasks, id) => {
    for (const t of tasks) {
      if (t.id === id) return t;
      if (t.children) { const f = findTask(t.children, id); if (f) return f; }
    }
    return null;
  };

  const updateTask = (id, mutate) => {
    setPlaybook(prev => {
      const newGroups = prev.groups.map(g => ({
        ...g,
        tasks: g.tasks.map(t => t.id === id ? mutate(t) : t),
      }));

      // Recount
      const all = newGroups.flatMap(g => g.tasks);
      const counts = {
        total: all.length,
        ok:    all.filter(t => t.status === 'ok').length,
        live:  all.filter(t => t.status === 'live').length,
        delta: all.filter(t => t.status === 'delta').length,
        fail:  all.filter(t => t.status === 'fail').length,
        awaiting: all.filter(t => t.review && t.review.state === 'pending').length,
      };
      return { ...prev, groups: newGroups, counts };
    });
  };

  const advanceBlocked = () => {
    // If 04 is no longer pending, flip 06-ui-kit from delta → live.
    setPlaybook(prev => {
      const newGroups = prev.groups.map(g => ({
        ...g,
        tasks: g.tasks.map(t => {
          if (t.id !== '06-ui-kit') return t;
          if (t.status !== 'delta') return t;
          return { ...t, status: 'live', summary: t.summary + ' Unblocked.' };
        }),
      }));
      const all = newGroups.flatMap(g => g.tasks);
      const counts = {
        total: all.length,
        ok:    all.filter(t => t.status === 'ok').length,
        live:  all.filter(t => t.status === 'live').length,
        delta: all.filter(t => t.status === 'delta').length,
        fail:  all.filter(t => t.status === 'fail').length,
        awaiting: all.filter(t => t.review && t.review.state === 'pending').length,
      };
      return { ...prev, groups: newGroups, counts };
    });
  };

  const pushToolMsg = (text) => {
    setChat(prev => [...prev, {
      id: 'm' + (prev.length + 1), role: 'tool', ts: '14:42:31', text,
    }]);
  };
  const pushAgentMsg = (text) => {
    setChat(prev => [...prev, {
      id: 'm' + (prev.length + 1), role: 'agent', ts: '14:42:34', text,
    }]);
  };

  const onApprove = (id) => {
    updateTask(id, t => ({
      ...t,
      status: 'ok',
      review: { state: 'approved', reviewer: 'you', note: 'Approved inline.', completedAt: '14:42:31' },
    }));
    advanceBlocked();
    pushToolMsg('✓ ' + id + ' · approved by you · DAG advancing');
    pushAgentMsg('Approved. *06-ui-kit* is unblocked and will start on the next wave.');
    setToast({ kind: 'approved', text: 'Approved · DAG advancing' });
    setTimeout(() => setToast(null), 3200);
  };

  const onChanges = (id, { note, tags }) => {
    updateTask(id, t => ({
      ...t,
      status: 'live',
      review: { state: 'changes', reviewer: 'you', note, tags, completedAt: '14:42:31' },
    }));
    pushToolMsg('Δ ' + id + ' · changes requested · note: "' + note.slice(0, 60) + (note.length > 60 ? '…' : '') + '"');
    pushAgentMsg('Respawning *' + id + '* with your feedback injected as additional context. Tags: ' + (tags.length ? tags.join(', ') : 'none') + '.');
    setToast({ kind: 'changes', text: 'Changes requested · respawn queued' });
    setTimeout(() => setToast(null), 3200);
  };

  const onReject = (id, { note }) => {
    updateTask(id, t => ({
      ...t,
      status: 'fail',
      review: { state: 'rejected', reviewer: 'you', note, completedAt: '14:42:31' },
    }));
    pushToolMsg('✕ ' + id + ' · rejected · ' + note.slice(0, 80));
    pushAgentMsg('Marked *' + id + '* terminally failed. Dependents will surface as blocked.');
    setToast({ kind: 'rejected', text: 'Rejected · task marked failed' });
    setTimeout(() => setToast(null), 3200);
  };

  const onSend = (text) => {
    setChat(prev => [...prev, {
      id: 'u' + Date.now(), role: 'user', ts: '14:43:02', text,
    }]);
    setTimeout(() => {
      setChat(prev => [...prev, {
        id: 'a' + Date.now(), role: 'agent', ts: '14:43:04',
        text: "Acknowledged. Queued as a follow-up task on the next wave.",
      }]);
    }, 400);
  };

  const onJumpToReview = () => {
    setActiveTab('playbook');
    setExpanded(prev => { const next = new Set(prev); next.add('04-define-type-scale'); return next; });
    // Scroll the workspace to top of the playbook tab
    const main = document.getElementById('cv-workspace-body');
    if (main) main.scrollTop = 0;
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '360px minmax(0, 1fr)',
      height: '100vh', minHeight: 720,
      background: 'var(--cv-bg)',
      color: 'var(--cv-text)',
      fontFamily: 'var(--cv-sans)',
    }}>
      <ChatPane
        playbook={playbook} chat={chat}
        onSend={onSend} onJumpToReview={onJumpToReview}
      />
      <main style={{
        display: 'grid', gridTemplateRows: 'auto 1fr',
        minWidth: 0, background: 'var(--cv-bg)',
      }}>
        <WorkspaceTabs
          tabs={TABS} activeId={activeTab} onSelect={setActiveTab}
          awaitingCount={playbook.counts.awaiting}
        />
        <div id="cv-workspace-body" style={{ overflowY: 'auto' }}>
          {activeTab === 'playbook' && (
            <PlaybookTab
              playbook={playbook}
              expanded={expanded} onToggle={onToggle}
              onApprove={onApprove} onChanges={onChanges} onReject={onReject}
              warning={{
                title: 'Crimson Pro Italic loaded from Google Fonts CDN, not @fontsource-variable.',
                body: 'If you need byte-for-byte parity with the upstream landing page, swap the @import url() in colors_and_type.css for self-hosted woff2 files in fonts/.',
              }}
            />
          )}
          {activeTab === 'journal' && <JournalTab playbook={playbook} />}
          {activeTab === 'files'   && <FilesTab playbook={playbook} />}
        </div>
      </main>

      {toast && <Toast kind={toast.kind} text={toast.text} />}
    </div>
  );
};

// ---- Toast ---------------------------------------------------

const Toast = ({ kind, text }) => {
  const map = {
    approved: { bg: 'var(--cv-status-ok)',    glyph: '✓' },
    changes:  { bg: 'var(--cv-status-delta)', glyph: 'Δ' },
    rejected: { bg: 'var(--cv-status-fail)',  glyph: '✕' },
  };
  const m = map[kind] || map.approved;
  return (
    <div style={{
      position: 'fixed', bottom: 18, left: 'calc(360px + (100vw - 360px) / 2)',
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
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
