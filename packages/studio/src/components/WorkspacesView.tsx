'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import {
  listWorkspaces,
  getCurrentWorkspace,
  setCurrentWorkspace,
  removeWorkspace,
  emitWorkspaceChange,
  onWorkspaceChange,
} from '../lib/workspaces';
import { navigate } from '../router';
import type { Workspace } from '../types';
import { AddWorkspaceModal } from './AddWorkspaceModal';

export function WorkspacesView() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function refresh() {
    setWorkspaces(listWorkspaces());
    setCurrentId(getCurrentWorkspace()?.id ?? null);
  }

  useEffect(() => {
    refresh();
    return onWorkspaceChange(refresh);
  }, []);

  function handleOpen(ws: Workspace) {
    setCurrentWorkspace(ws.id);
    emitWorkspaceChange();
    navigate({ kind: 'home', view: 'playbooks' });
  }

  function handleRemove(e: React.MouseEvent, ws: Workspace) {
    e.stopPropagation();
    if (!confirm(`Remove workspace "${ws.name}" from the list? (Files on disk are not deleted.)`)) return;
    removeWorkspace(ws.id);
    emitWorkspaceChange();
    refresh();
  }

  return (
    <div className="entry-section">
      <header className="entry-section__head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="entry-section__title">Workspaces</h1>
        <button
          type="button"
          className="folder-picker__run"
          onClick={() => setShowAdd(true)}
          style={{ padding: '6px 12px' }}
        >
          <Plus size={14} /> Open workspace
        </button>
      </header>

      {workspaces.length === 0 ? (
        <div className="entry-section__empty">
          <FolderOpen size={32} />
          <p>No workspaces yet. Open a folder that contains a <code>.converge/</code> directory.</p>
          <button
            type="button"
            className="folder-picker__run"
            onClick={() => setShowAdd(true)}
            style={{ marginTop: 12 }}
          >
            <Plus size={14} /> Open workspace
          </button>
        </div>
      ) : (
        <div className="workspaces-grid">
          {workspaces.map(ws => (
            <div
              key={ws.id}
              className={`workspace-card${ws.id === currentId ? ' is-active' : ''}`}
              onClick={() => handleOpen(ws)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleOpen(ws); }}
            >
              <header className="workspace-card__head">
                <FolderOpen size={16} />
                <span className="workspace-card__name">{ws.name}</span>
                {ws.id === currentId && <span className="workspace-card__active-pill">current</span>}
              </header>
              {ws.description && <p className="workspace-card__desc">{ws.description}</p>}
              <code className="workspace-card__path">{ws.path}</code>
              <footer className="workspace-card__foot">
                {typeof ws.playbookCount === 'number' && (
                  <span>{ws.playbookCount} {ws.playbookCount === 1 ? 'playbook' : 'playbooks'}</span>
                )}
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  className="workspace-card__remove"
                  onClick={(e) => handleRemove(e, ws)}
                  aria-label="Remove workspace"
                  title="Remove from list"
                >
                  <Trash2 size={12} />
                </button>
              </footer>
            </div>
          ))}
        </div>
      )}

      <AddWorkspaceModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
