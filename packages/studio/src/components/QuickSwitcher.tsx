import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskNode } from '../types';

interface Props {
  tasks: TaskNode[];
  onSelectTask: (id: string) => void;
  onClose: () => void;
}

export function QuickSwitcher({ tasks, onSelectTask, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q),
    );
  }, [tasks, query]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[cursor];
      if (item) onSelectTask(item.id);
    }
  }

  return (
    <div className="quick-switcher-overlay" onClick={onClose}>
      <div className="quick-switcher" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="quick-switcher__input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks..."
        />
        <div className="quick-switcher__list">
          {filtered.map((task, i) => (
            <button
              key={task.id}
              type="button"
              className={`quick-switcher__item${i === cursor ? ' quick-switcher__item--active' : ''}`}
              onClick={() => onSelectTask(task.id)}
            >
              <span className={`quick-switcher__dot quick-switcher__dot--${task.status}`} />
              <span className="quick-switcher__name">{task.title}</span>
              <span className="quick-switcher__id">{task.id}</span>
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="quick-switcher__empty">No matching tasks</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
