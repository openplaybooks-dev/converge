'use client';

import { useEffect, useState, useCallback } from 'react';
import { Folder, FolderOpen, ArrowUp, Loader2, CheckCircle, ChevronRight } from 'lucide-react';

interface BrowseEntry {
  name: string;
  path: string;
  hasConverge: boolean;
}

interface BrowseResult {
  path: string;
  parent: string | null;
  entries: BrowseEntry[];
  hasConvergeHere: boolean;
}

interface Props {
  initialPath?: string;
  /** Filter shown entries: 'workspaces-only' shows only folders with .converge,
   *  'all' shows everything (default). */
  filter?: 'all' | 'workspaces-only';
  /** Called when user clicks "Select this folder" button. */
  onSelect: (path: string, hasConverge: boolean) => void;
  /** Label for the select button. */
  selectLabel?: string;
  /** Disable the select button (e.g. while saving). */
  selectDisabled?: boolean;
  /** Optional: require .converge/ presence to enable select (for "open existing"). */
  requireConverge?: boolean;
}

export function FolderBrowser({
  initialPath,
  filter = 'all',
  onSelect,
  selectLabel = 'Select this folder',
  selectDisabled,
  requireConverge,
}: Props) {
  const [data, setData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualPath, setManualPath] = useState('');

  const load = useCallback(async (path?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = path
        ? `/api/fs/browse?path=${encodeURIComponent(path)}`
        : '/api/fs/browse';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      setData(json);
      setManualPath(json.path);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialPath);
  }, [initialPath, load]);

  function go(path: string) {
    load(path);
  }

  function goToManual() {
    if (manualPath.trim()) load(manualPath.trim());
  }

  const filteredEntries = data && filter === 'workspaces-only'
    ? data.entries.filter(e => e.hasConverge)
    : data?.entries ?? [];

  const canSelect = data && !loading && (
    requireConverge ? data.hasConvergeHere : true
  );

  // Build breadcrumb segments
  const breadcrumbs = data?.path
    ? data.path.split(/[\\\/]/).filter(Boolean)
    : [];

  return (
    <div className="folder-browser">
      {/* Path input + Go button (allows direct typing) */}
      <div className="folder-browser__pathbar">
        <input
          type="text"
          className="folder-picker__input"
          value={manualPath}
          onChange={(e) => setManualPath(e.target.value)}
          placeholder="Enter a path or browse below…"
          onKeyDown={(e) => { if (e.key === 'Enter') goToManual(); }}
        />
        <button
          type="button"
          className="folder-picker__cancel"
          onClick={goToManual}
          disabled={loading}
        >
          Go
        </button>
      </div>

      {/* Breadcrumbs */}
      {data && (
        <div className="folder-browser__crumbs">
          {data.parent && (
            <button
              type="button"
              className="folder-browser__up"
              onClick={() => go(data.parent!)}
              title="Up one level"
            >
              <ArrowUp size={12} />
            </button>
          )}
          {breadcrumbs.map((seg, i) => {
            const segPath = data.path.split(/[\\\/]/).slice(0, i + 1).join('\\');
            return (
              <span key={i} className="folder-browser__crumb">
                {i > 0 && <ChevronRight size={10} />}
                <button
                  type="button"
                  className="folder-browser__crumb-btn"
                  onClick={() => go(segPath)}
                >
                  {seg}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Body */}
      {error && <div className="folder-browser__error">{error}</div>}
      {loading && !data && (
        <div className="folder-browser__loading">
          <Loader2 size={16} className="run-view__spin" /> Loading…
        </div>
      )}
      {data && (
        <div className="folder-browser__list">
          {filteredEntries.length === 0 ? (
            <div className="folder-browser__empty">
              {filter === 'workspaces-only'
                ? 'No converge workspaces in this folder.'
                : 'No folders here.'}
            </div>
          ) : (
            filteredEntries.map(entry => (
              <button
                key={entry.path}
                type="button"
                className="folder-browser__entry"
                onClick={() => go(entry.path)}
                title={entry.path}
              >
                {entry.hasConverge
                  ? <FolderOpen size={14} style={{ color: 'var(--cv-accent-warm)' }} />
                  : <Folder size={14} style={{ color: 'var(--cv-text-dim)' }} />
                }
                <span className="folder-browser__entry-name">{entry.name}</span>
                {entry.hasConverge && (
                  <span className="folder-browser__entry-badge">
                    <CheckCircle size={10} /> workspace
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}

      {/* Select footer */}
      <div className="folder-browser__foot">
        <div className="folder-browser__foot-meta">
          {data && (
            <>
              <span className="folder-browser__foot-path" title={data.path}>{data.path}</span>
              {data.hasConvergeHere && (
                <span className="folder-browser__foot-pill">
                  <CheckCircle size={10} /> has .converge
                </span>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          className="folder-picker__run"
          disabled={!canSelect || selectDisabled}
          onClick={() => data && onSelect(data.path, data.hasConvergeHere)}
        >
          {selectLabel}
        </button>
      </div>
    </div>
  );
}
