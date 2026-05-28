'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, FolderOpen, Plus, Check } from 'lucide-react';
import {
  listWorkspaces,
  getCurrentWorkspace,
  setCurrentWorkspace,
  emitWorkspaceChange,
  onWorkspaceChange,
} from '../lib/workspaces';
import type { Workspace } from '../types';
import { AddWorkspaceModal } from './AddWorkspaceModal';

export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState<Workspace | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function refresh() {
    setWorkspaces(listWorkspaces());
    setCurrent(getCurrentWorkspace());
  }

  useEffect(() => {
    refresh();
    return onWorkspaceChange(refresh);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  function handleSelect(id: string) {
    setCurrentWorkspace(id);
    emitWorkspaceChange();
    refresh();
    setOpen(false);
  }

  return (
    <div className="workspace-switcher" ref={ref}>
      <button
        type="button"
        className="workspace-switcher__trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FolderOpen size={14} />
        <span className="workspace-switcher__name">
          {current?.name || 'No workspace'}
        </span>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="workspace-switcher__menu" role="listbox">
          {workspaces.length === 0 ? (
            <div className="workspace-switcher__empty">No workspaces yet.</div>
          ) : (
            <ul className="workspace-switcher__list">
              {workspaces.map(ws => (
                <li key={ws.id}>
                  <button
                    type="button"
                    className={`workspace-switcher__item${ws.id === current?.id ? ' is-active' : ''}`}
                    onClick={() => handleSelect(ws.id)}
                  >
                    <span className="workspace-switcher__check">
                      {ws.id === current?.id ? <Check size={12} /> : null}
                    </span>
                    <span className="workspace-switcher__item-main">
                      <span className="workspace-switcher__item-name">{ws.name}</span>
                      <span className="workspace-switcher__item-path">{ws.path}</span>
                    </span>
                    {typeof ws.playbookCount === 'number' && (
                      <span className="workspace-switcher__item-count">
                        {ws.playbookCount}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="workspace-switcher__divider" />
          <button
            type="button"
            className="workspace-switcher__action"
            onClick={() => { setOpen(false); setShowAdd(true); }}
          >
            <Plus size={12} />
            Open workspace…
          </button>
        </div>
      )}
      <AddWorkspaceModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
      />
    </div>
  );
}
