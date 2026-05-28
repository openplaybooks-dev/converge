'use client';

import { useState, useEffect } from 'react';
import type { PlaybookData, ArtifactSpec } from '../playbook-data';
import { FilePreview } from './preview/FilePreview';

interface ArtifactFile {
  spec: ArtifactSpec;
  path: string;
  name: string;
}

interface FileEntry {
  path: string;
  name: string;
  size?: number;
}

interface GroupedFiles {
  group: string;
  label: string;
  files: FileEntry[];
}

function formatSize(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getFileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
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

interface FileTreeProps {
  grouped: GroupedFiles[];
  expandedGroups: Set<string>;
  onToggleGroup: (group: string) => void;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function FileTree({ grouped, expandedGroups, onToggleGroup, selectedPath, onSelectFile }: FileTreeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {grouped.map(group => (
        <div key={group.group}>
          <button
            onClick={() => onToggleGroup(group.group)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px',
              background: '#F5F2EA', border: '1px solid var(--cv-border)',
              borderRadius: 2, cursor: 'pointer',
              fontFamily: 'var(--cv-sans)', fontSize: 11.5, fontWeight: 600,
              color: 'var(--cv-text)', width: '100%', textAlign: 'left',
            }}
          >
            <span style={{ fontFamily: 'var(--cv-mono)', color: 'var(--cv-text-dim)', fontSize: 10 }}>
              {expandedGroups.has(group.group) ? '▾' : '▸'}
            </span>
            {group.label}
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--cv-mono)', color: 'var(--cv-text-dim)', fontSize: 10 }}>
              {group.files.length}
            </span>
          </button>
          {expandedGroups.has(group.group) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
              {group.files.map(file => (
                <button
                  key={file.path}
                  onClick={() => onSelectFile(file.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px',
                    background: selectedPath === file.path ? '#F5F2EA' : '#FFFFFF',
                    border: '1px solid',
                    borderColor: selectedPath === file.path ? 'var(--cv-border)' : 'transparent',
                    borderRadius: 2, cursor: 'pointer',
                    fontFamily: 'var(--cv-mono)', fontSize: 11,
                    color: 'var(--cv-text)', width: '100%', textAlign: 'left',
                    transition: 'background 80ms',
                  }}
                >
                  <span>{getFileIcon(file.name)}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  {file.size && (
                    <span style={{ color: 'var(--cv-text-dim)', fontSize: 10, flexShrink: 0 }}>
                      {formatSize(file.size)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface FileViewerProps {
  path: string;
  content?: string;
  base64?: string;
  contentType?: string;
  size?: number;
}

function FileViewerHeader({ path, size }: { path: string; size?: number }) {
  const name = getFileName(path);
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 8,
      padding: '10px 16px', borderBottom: '1px solid var(--cv-border)',
      background: '#F5F2EA',
    }}>
      <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 12, fontWeight: 600, color: 'var(--cv-text)' }}>
        {name}
      </span>
      <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)', flex: 1 }}>
        {path}
      </span>
      {size && (
        <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 10, color: 'var(--cv-text-dim)' }}>
          {formatSize(size)}
        </span>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 8,
      color: 'var(--cv-text-muted)', fontFamily: 'var(--cv-sans)', fontSize: 13,
    }}>
      <span style={{ fontSize: 28, opacity: 0.4 }}>◈</span>
      <span>{message}</span>
    </div>
  );
}

export function ArtifactsTab({ playbook }: { playbook: PlaybookData }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<Record<string, { content?: string; base64?: string; contentType?: string; size?: number }>>({});
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const artifacts = playbook.artifacts ?? [];

  // Group artifacts by group key
  const grouped: GroupedFiles[] = [];
  const groupMap = new Map<string, GroupedFiles>();
  for (const spec of artifacts) {
    const key = spec.group ?? 'default';
    if (!groupMap.has(key)) {
      groupMap.set(key, { group: key, label: key === 'default' ? 'Files' : key, files: [] });
      grouped.push(groupMap.get(key)!);
    }
    // Add the spec itself as a file entry (for now, just the glob pattern)
    groupMap.get(key)!.files.push({ path: spec.glob, name: getFileName(spec.glob) });
  }

  // Expand all groups by default on first render
  useEffect(() => {
    if (expandedGroups.size === 0 && grouped.length > 0) {
      setExpandedGroups(new Set(grouped.map(g => g.group)));
    }
  }, [grouped.length]);

  async function loadFile(path: string) {
    if (files[path]) {
      setSelectedPath(path);
      return;
    }
    setLoadingPath(path);
    try {
      const res = await fetch(
        `/api/playbooks/${encodeURIComponent(playbook.name)}/artifacts?path=${encodeURIComponent(path)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => ({ ...prev, [path]: data }));
        setSelectedPath(path);
      }
    } catch {}
    setLoadingPath(null);
  }

  function toggleGroup(group: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  const selected = selectedPath ? files[selectedPath] : null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Left: File tree */}
      <div style={{
        borderRight: '1px solid var(--cv-border)',
        overflowY: 'auto',
        padding: '12px',
        background: '#FAFAF7',
      }}>
        {artifacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--cv-text-muted)', fontFamily: 'var(--cv-sans)', fontSize: 12 }}>
            No artifacts configured.
            <br />
            <code style={{ fontSize: 10, background: '#F5F2EA', padding: '2px 6px', borderRadius: 2, marginTop: 4, display: 'inline-block' }}>
              artifacts:
            </code>
          </div>
        ) : (
          <FileTree
            grouped={grouped}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            selectedPath={selectedPath}
            onSelectFile={loadFile}
          />
        )}
      </div>

      {/* Right: File viewer */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedPath ? (
          <EmptyState message="Select a file to preview" />
        ) : loadingPath === selectedPath ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--cv-text-muted)', fontFamily: 'var(--cv-sans)', fontSize: 13 }}>
            Loading…
          </div>
        ) : selected ? (
          <>
            <FileViewerHeader path={selectedPath} size={selected.size} />
            <div style={{ flex: 1, overflow: 'auto' }}>
              <FilePreview
                content={selected.content ?? ''}
                contentType={selected.contentType ?? 'text/plain'}
                base64={selected.base64}
                fileName={selectedPath}
                filePath={selectedPath}
                playbookName={playbook.name}
              />
            </div>
          </>
        ) : (
          <EmptyState message="Failed to load file" />
        )}
      </div>
    </div>
  );
}