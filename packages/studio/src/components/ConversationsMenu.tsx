import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import type { StudioSession } from '../types';
import { Plus, MessageSquare } from 'lucide-react';

interface Props {
  sessions: StudioSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationsMenu({ sessions, activeId, onSelect }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = sessions.find((s) => s.id === activeId);

  return (
    <div className="conversations-menu" ref={wrapRef}>
      <button
        type="button"
        className="conversations-menu__pill"
        onClick={() => setOpen((v) => !v)}
      >
        <MessageSquare size={14} />
        <span>{active?.name ?? 'Sessions'}</span>
      </button>
      {open ? (
        <div className="conversations-menu__dropdown">
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`conversations-menu__item${s.id === activeId ? ' conversations-menu__item--active' : ''}`}
              onClick={() => {
                onSelect(s.id);
                setOpen(false);
              }}
            >
              <span className="conversations-menu__name">{s.name}</span>
              <span className={`conversations-menu__status conversations-menu__status--${s.status}`}>
                {s.status}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
