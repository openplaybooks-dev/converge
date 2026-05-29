'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PlaybookData } from '../playbook-data';
import { ArtifactPreviewModal } from './preview/ArtifactPreviewModal';
import { workspaceHeaders } from '../providers/converge-api';

interface FileEntry {
  path: string;
  name: string;
  size?: number;
}

interface ArtifactGroup {
  id: string;
  label: string;
  files: FileEntry[];
}

interface ListResponse {
  patternCount: number;
  fileCount: number;
  groups: ArtifactGroup[];
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const iconMap: Record<string, string> = {
    md: '📄', markdown: '📄',
    json: '{}', js: '📄', ts: '📄',
    css: '🎨', html: '🌐', htm: '🌐',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🖼',
    txt: '📝', yml: '⚙', yaml: '⚙',
  };
  return iconMap[ext] ?? '📄';
}

export function ArtifactsTab({ playbook }: { playbook: PlaybookData }) {
  const [groups, setGroups] = useState<ArtifactGroup[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [patternCount, setPatternCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [modalPath, setModalPath] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbook.name)}/artifacts/list`,
        { headers: workspaceHeaders() },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setListError(body.error || `HTTP ${res.status}`);
        setGroups([]);
        return;
      }
      const data: ListResponse = await res.json();
      setGroups(data.groups ?? []);
      setPatternCount(data.patternCount ?? 0);
      setExpandedGroups(new Set((data.groups ?? []).map(g => g.id)));
    } catch (err: any) {
      setListError(err?.message ?? 'Failed to load artifacts');
      setGroups([]);
    } finally {
      setListLoading(false);
    }
  }, [playbook.name]);

  // Re-fetch whenever the run id changes (a fresh run may produce new files).
  useEffect(() => { fetchList(); }, [fetchList, playbook.runId]);

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const fileCount = groups.reduce((n, g) => n + g.files.length, 0);

  return (
    <div style={{ padding: '20px 32px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--cv-sans)', fontSize: 16, fontWeight: 600, color: 'var(--cv-text)' }}>
          Artifacts
        </h2>
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>
          {fileCount} file{fileCount === 1 ? '' : 's'} · {patternCount} pattern{patternCount === 1 ? '' : 's'}
        </span>
      </header>

      {listLoading ? (
        <EmptyState message="Loading artifacts…" />
      ) : listError ? (
        <EmptyState message={`Failed to load artifacts: ${listError}`} />
      ) : groups.length === 0 ? (
        <EmptyState
          message={
            patternCount === 0
              ? 'No outputs declared on any task.'
              : 'No artifacts produced yet. Run the playbook to generate files.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(group => {
            const expanded = expandedGroups.has(group.id);
            return (
              <section key={group.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: '#F5F2EA', border: '1px solid var(--cv-border)',
                    borderRadius: 2, cursor: 'pointer',
                    fontFamily: 'var(--cv-sans)', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--cv-text)', width: '100%', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--cv-mono)', color: 'var(--cv-text-dim)', fontSize: 10 }}>
                    {expanded ? '▾' : '▸'}
                  </span>
                  {group.label}
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--cv-mono)', color: 'var(--cv-text-dim)', fontSize: 10 }}>
                    {group.files.length}
                  </span>
                </button>
                {expanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 4 }}>
                    {group.files.map(file => (
                      <button
                        key={file.path}
                        onClick={() => setModalPath(file.path)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px',
                          background: '#FFFFFF',
                          border: '1px solid transparent',
                          borderRadius: 2, cursor: 'pointer',
                          fontFamily: 'var(--cv-mono)', fontSize: 11.5,
                          color: 'var(--cv-text)', width: '100%', textAlign: 'left',
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
                        <span>{getFileIcon(file.name)}</span>
                        <span style={{ color: 'var(--cv-text)' }}>{file.path}</span>
                        <span style={{ flex: 1 }} />
                        {file.size != null && (
                          <span style={{ color: 'var(--cv-text-dim)', fontSize: 10 }}>
                            {formatSize(file.size)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {modalPath && (
        <ArtifactPreviewModal
          playbookName={playbook.name}
          path={modalPath}
          onClose={() => setModalPath(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 16px', gap: 8,
      color: 'var(--cv-text-muted)', fontFamily: 'var(--cv-sans)', fontSize: 13,
    }}>
      <span style={{ fontSize: 28, opacity: 0.4 }}>◈</span>
      <span>{message}</span>
    </div>
  );
}
