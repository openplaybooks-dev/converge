// =============================================================
// Converge UI Kit — chat.jsx
// Left-rail chat: header, conversation, composer.
// =============================================================

const ChatHeader = ({ playbook }) => (
  <header style={{
    padding: '14px 18px',
    borderBottom: '1px solid var(--cv-border)',
    background: 'var(--cv-bg)',
    display: 'flex', alignItems: 'center', gap: 12,
  }}>
    <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: 'inherit' }}>
      <svg width="24" height="24" viewBox="0 0 170 170" aria-hidden="true">
        <polygon points="0,170 170,170 170,0" fill="#D1CDB8"/>
        <polygon points="0,0 0,170 170,0" fill="#8B8772" opacity="0.7"/>
        <line x1="0" y1="170" x2="170" y2="0" stroke="#BE5133" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </a>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
      <span style={{ fontFamily: 'var(--cv-sans)', fontWeight: 600, fontSize: 14, color: 'var(--cv-text)' }}>
        Converge — {playbook.name}
      </span>
      <Caption>
        run · {playbook.runId.slice(0, 17)} <span style={{ color: 'var(--cv-text)' }}>·</span> {playbook.provider}
      </Caption>
    </div>
    <button className="cv-btn cv-btn--ghost" style={{ padding: '5px 9px', fontSize: 12 }} aria-label="New chat">
      <span style={{ fontFamily: 'var(--cv-mono)' }}>+</span>
    </button>
  </header>
);

// ---- single chat message -------------------------------------

const ChatMessage = ({ msg, onJump }) => {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <Caption>You · {msg.ts}</Caption>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--cv-border)',
          borderRadius: 2,
          padding: '10px 12px',
          fontSize: 13.5, lineHeight: 1.55,
          maxWidth: '92%',
          color: 'var(--cv-text)',
        }}>{msg.text}</div>
      </div>
    );
  }
  if (msg.role === 'tool') {
    // Tool / event line — terse, mono
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10,
        alignItems: 'baseline',
        fontFamily: 'var(--cv-mono)', fontSize: 12, color: 'var(--cv-text-muted)',
      }}>
        <span style={{ color: 'var(--cv-text-dim)' }}>{msg.ts}</span>
        <span>{msg.text}</span>
      </div>
    );
  }
  // Agent message
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 16, height: 16, borderRadius: 2,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--cv-text)', color: '#FFF',
          fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 700,
        }}>C</span>
        <Caption>Converge · {msg.ts}</Caption>
      </div>
      <div style={{
        background: msg.highlight ? 'var(--cv-highlight-bg)' : 'transparent',
        border: msg.highlight ? '1px solid #F3D89A' : '1px solid transparent',
        borderLeft: msg.highlight ? '3px solid var(--cv-status-delta)' : '3px solid transparent',
        borderRadius: 2,
        padding: msg.highlight ? '10px 12px' : '0 0 0 9px',
        fontSize: 13.5, lineHeight: 1.6,
        color: 'var(--cv-text)',
      }}
        // Render *foo* as Crimson Pro italic terracotta — the brand motif.
        dangerouslySetInnerHTML={{
          __html: msg.text.replace(
            /\*([^*]+)\*/g,
            '<em style="font-family:var(--cv-serif); font-style:italic; font-weight:500; color:var(--cv-accent-warm);">$1</em>'
          ),
        }}
      />
      {msg.highlight && (
        <button
          onClick={onJump}
          className="cv-btn cv-btn--primary"
          style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12.5 }}
        >Open task 04 →</button>
      )}
    </div>
  );
};

// ---- ChatComposer --------------------------------------------

const ChatComposer = ({ onSend }) => {
  const [val, setVal] = useState('');
  const submit = () => { if (val.trim()) { onSend(val); setVal(''); } };
  return (
    <div style={{
      padding: '10px 12px 12px',
      borderTop: '1px solid var(--cv-border)',
      background: 'var(--cv-bg)',
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--cv-border-strong)',
        borderRadius: 2,
        padding: 8,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          rows={2}
          placeholder="Describe what you want to build, or @-mention a task to review…"
          style={{
            border: 'none', outline: 'none', resize: 'none',
            padding: '4px 6px',
            fontFamily: 'var(--cv-sans)', fontSize: 13.5, lineHeight: 1.5,
            color: 'var(--cv-text)', background: 'transparent', width: '100%',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>+ Attach</button>
            <button className="cv-btn cv-btn--ghost" style={{ padding: '4px 8px', fontSize: 11.5 }}>/ Skills</button>
          </div>
          <button
            className="cv-btn cv-btn--primary"
            onClick={submit}
            style={{ padding: '5px 12px', fontSize: 12.5 }}
            disabled={!val.trim()}
          >Send ↵</button>
        </div>
      </div>
      <Caption>↵ Send · ⌘↵ Submit · @ Mention task</Caption>
    </div>
  );
};

// ---- ChatPane (composer + scrollback) ------------------------

const ChatPane = ({ playbook, chat, onSend, onJumpToReview }) => (
  <aside style={{
    borderRight: '1px solid var(--cv-border)',
    background: 'var(--cv-bg)',
    display: 'grid', gridTemplateRows: 'auto 1fr auto',
    minHeight: 0,
  }}>
    <ChatHeader playbook={playbook} />
    <div style={{
      overflowY: 'auto',
      padding: '14px 14px 18px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {chat.map(m => <ChatMessage key={m.id} msg={m} onJump={onJumpToReview} />)}
    </div>
    <ChatComposer onSend={onSend} />
  </aside>
);

Object.assign(window, { ChatPane, ChatMessage, ChatComposer, ChatHeader });
