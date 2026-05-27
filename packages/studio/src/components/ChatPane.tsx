import { useState } from 'react';
import type { PlaybookData, ChatMsg } from '../playbook-data';
import { italicize } from './primitives';

function ChatHeader({ playbook }: { playbook: PlaybookData }) {
  return (
    <header style={{
      padding: '8px 12px',
      borderBottom: '1px solid var(--cv-border)',
      background: 'var(--cv-bg)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <svg width="16" height="16" viewBox="0 0 170 170" aria-hidden="true" style={{ flexShrink: 0 }}>
        <polygon points="0,170 170,170 170,0" fill="#D1CDB8"/>
        <polygon points="0,0 0,170 170,0" fill="#8B8772" opacity="0.7"/>
        <line x1="0" y1="170" x2="170" y2="0" stroke="#BE5133" strokeWidth="4" strokeLinecap="round"/>
      </svg>
      <span style={{ fontFamily: 'var(--cv-mono)', fontWeight: 500, fontSize: 12, color: 'var(--cv-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {playbook.name}
      </span>
      <button style={{ background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', fontFamily: 'var(--cv-mono)', fontSize: 14, color: 'var(--cv-text-dim)' }} aria-label="New chat">+</button>
    </header>
  );
}

function ChatMessage({ msg, onJump }: { msg: ChatMsg; onJump?: () => void }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          maxWidth: '85%',
          fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
          color: 'rgba(15, 12, 8, 0.64)',
        }}>{msg.text}</div>
      </div>
    );
  }

  if (msg.role === 'tool') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)',
      }}>
        <span style={{ color: 'var(--cv-text-dim)', fontSize: 10 }}>⚡</span>
        <span>{msg.text}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {msg.highlight ? (
        <div style={{
          background: 'var(--cv-highlight-bg)',
          border: '1px solid #F3D89A',
          borderLeft: '3px solid var(--cv-status-delta)',
          borderRadius: 2,
          padding: '8px 10px',
          fontSize: 13, lineHeight: 1.6,
          color: 'var(--cv-text)',
        }} dangerouslySetInnerHTML={{ __html: italicize(msg.text) }} />
      ) : (
        <div style={{
          fontSize: 13, lineHeight: 1.6,
          color: 'var(--cv-text)',
        }} dangerouslySetInnerHTML={{ __html: italicize(msg.text) }} />
      )}
      {msg.highlight && onJump && (
        <button
          onClick={onJump}
          style={{
            alignSelf: 'flex-start',
            background: 'var(--cv-text)', border: '1px solid var(--cv-text)', color: 'var(--cv-bg)',
            borderRadius: 2, padding: '4px 10px',
            fontFamily: 'var(--cv-sans)', fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer',
          }}
        >Open task 04 →</button>
      )}
    </div>
  );
}

function ChatComposer({ onSend }: { onSend: (text: string) => void }) {
  const [val, setVal] = useState('');
  const submit = () => { if (val.trim()) { onSend(val); setVal(''); } };
  return (
    <div style={{
      padding: '8px 12px 10px',
      borderTop: '1px solid var(--cv-border)',
      background: 'var(--cv-bg)',
    }}>
      <textarea
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        rows={3}
        placeholder="Describe what you want to create..."
        style={{
          width: '100%', resize: 'none',
          padding: '8px 10px',
          border: '1px solid var(--cv-border)',
          borderRadius: 2,
          fontFamily: 'var(--cv-sans)', fontSize: 13, lineHeight: 1.5,
          color: 'var(--cv-text)', background: '#FFFFFF',
          outline: 'none',
          marginBottom: 6,
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--cv-text-dim)', fontSize: 16 }} title="Add to chat">+</button>
          <button style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--cv-text-dim)', fontFamily: 'var(--cv-mono)', fontSize: 11 }} title="Change model">⚙</button>
        </div>
        <button
          onClick={submit}
          disabled={!val.trim()}
          style={{
            background: val.trim() ? 'var(--cv-text)' : 'var(--cv-border)',
            border: 'none', borderRadius: 2,
            color: '#FFF', padding: '5px 12px',
            fontFamily: 'var(--cv-sans)', fontSize: 12, fontWeight: 500,
            cursor: val.trim() ? 'pointer' : 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            opacity: val.trim() ? 1 : 0.5,
          }}
        >↵ Send</button>
      </div>
    </div>
  );
}

export function ChatPane({ playbook, chat, onSend, onJumpToReview }: {
  playbook: PlaybookData;
  chat: ChatMsg[];
  onSend: (text: string) => void;
  onJumpToReview: () => void;
}) {
  return (
    <aside style={{
      borderRight: '1px solid var(--cv-border)',
      background: 'var(--cv-bg)',
      display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto',
      minHeight: 0,
      overflow: 'hidden',
    }}>
      <ChatHeader playbook={playbook} />
      <div style={{
        overflowY: 'auto',
        padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {chat.map(m => <ChatMessage key={m.id} msg={m} onJump={onJumpToReview} />)}
      </div>
      <ChatComposer onSend={onSend} />
    </aside>
  );
}
