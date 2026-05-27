import { useState } from 'react';
import type { PlaybookSummary } from '../types';
import { Plus, Compass, FolderOpen, Loader2 } from 'lucide-react';
import { navigate } from '../router';

interface Props {
  playbooks: PlaybookSummary[];
  onOpenPlaybook: (name: string) => void;
  onViewAllPlaybooks: () => void;
}

const STATUS_GLYPH: Record<string, { glyph: string; cls: string }> = {
  complete: { glyph: '✓', cls: 'cv-status--ok' },
  running:  { glyph: '●', cls: 'cv-status--live' },
  error:    { glyph: '✕', cls: 'cv-status--fail' },
  pending:  { glyph: '○', cls: '' },
};

const EXAMPLE_PLAYBOOKS = [
  { name: 'hello-world', description: 'Minimal 2-task example to learn the playbook format' },
  { name: 'data-pipeline', description: 'ETL pipeline — extract, transform, load with schema validation' },
  { name: 'conceptual-design', description: 'Generate interactive HTML design concepts from a brief' },
  { name: 'deep-research', description: 'Multi-phase literature review and synthesis' },
  { name: 'fullstack-app', description: 'Scaffold and build a full-stack web application' },
  { name: 'flutter-app', description: 'Generate a cross-platform Flutter mobile app' },
];

export function HomeView({ playbooks, onOpenPlaybook, onViewAllPlaybooks }: Props) {
  const recent = playbooks.slice(0, 4);
  const [scaffolding, setScaffolding] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState('');
  const [scaffoldError, setScaffoldError] = useState('');

  async function handleScaffoldAndRun(example: string, targetDir: string) {
    setScaffolding(example);
    setScaffoldError('');
    try {
      const res = await fetch('/api/playbooks/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ example, targetDir }),
      });
      const data = await res.json();
      if (!res.ok) {
        setScaffoldError(data.error || 'Scaffold failed');
        setScaffolding(null);
        return;
      }

      const pbName = data.playbooks?.[0] || 'default';
      setShowFolderPicker(null);
      setScaffolding(null);
      navigate({ kind: 'playbook-run', playbookName: pbName, executionId: 'latest' });
    } catch (err: any) {
      setScaffoldError(err.message);
      setScaffolding(null);
    }
  }

  function onExampleClick(example: string) {
    setShowFolderPicker(example);
    setFolderPath(`D:\\converge-runs\\${example}`);
    setScaffoldError('');
  }

  return (
    <div className="home-view">
      <div className="home-hero">
        <svg width="40" height="40" viewBox="0 0 170 170" aria-hidden="true">
          <polygon points="0,170 170,170 170,0" fill="#D1CDB8"/>
          <polygon points="0,0 0,170 170,0" fill="#8B8772" opacity="0.7"/>
          <line x1="0" y1="170" x2="170" y2="0" stroke="#BE5133" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <h1 className="home-hero__title">Converge Studio</h1>
        <p className="home-hero__subtitle">
          Long-running AI agents that adapt until <em style={{
            fontFamily: 'var(--cv-serif)',
            fontStyle: 'italic',
            fontWeight: 500,
            color: 'var(--cv-accent-warm)',
          }}>outcomes converge</em>.
        </p>
      </div>

      <div className="home-actions">
        <button type="button" className="home-action-card home-action-card--primary">
          <Plus size={20} />
          <div>
            <span className="home-action-card__title">Plan new playbook</span>
            <span className="home-action-card__desc">Describe your goal and let the planner scaffold a task DAG</span>
          </div>
        </button>
        <button type="button" className="home-action-card" onClick={onViewAllPlaybooks}>
          <Compass size={20} />
          <div>
            <span className="home-action-card__title">Explore examples</span>
            <span className="home-action-card__desc">Browse community playbooks for data pipelines, apps, research</span>
          </div>
        </button>
      </div>

      {recent.length > 0 && (
        <section className="home-recent">
          <header className="home-recent__head">
            <h2 className="home-recent__title">Recent playbooks</h2>
            <button type="button" className="home-recent__view-all" onClick={onViewAllPlaybooks}>
              View all
            </button>
          </header>
          <div className="home-recent__strip">
            {recent.map((pb) => {
              const sg = STATUS_GLYPH[pb.status] ?? STATUS_GLYPH.pending;
              return (
                <button
                  key={pb.name}
                  type="button"
                  className="home-recent__card"
                  onClick={() => onOpenPlaybook(pb.name)}
                >
                  <span style={{
                    fontFamily: 'var(--cv-mono)',
                    fontWeight: 600,
                    fontSize: 13,
                  }} className={sg.cls}>{sg.glyph}</span>
                  <span className="home-recent__card-name">{pb.name}</span>
                  <span className={`home-recent__card-badge home-recent__card-badge--${pb.status}`}>
                    {pb.status}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="home-examples">
        <header className="home-recent__head">
          <h2 className="home-recent__title">Example playbooks</h2>
        </header>
        <div className="home-examples__grid">
          {EXAMPLE_PLAYBOOKS.map((ex) => (
            <button
              key={ex.name}
              type="button"
              className="home-example-card"
              onClick={() => onExampleClick(ex.name)}
              disabled={scaffolding === ex.name}
            >
              {scaffolding === ex.name ? (
                <Loader2 size={14} className="run-view__spin" />
              ) : (
                <FolderOpen size={14} style={{ color: 'var(--cv-text-dim)' }} />
              )}
              <span className="home-example-card__name">{ex.name}</span>
              <span className="home-example-card__desc">{ex.description}</span>
            </button>
          ))}
        </div>
      </section>

      {showFolderPicker && (
        <div className="folder-picker__backdrop" onClick={() => setShowFolderPicker(null)}>
          <div className="folder-picker" onClick={(e) => e.stopPropagation()}>
            <h2 className="folder-picker__title">Run "{showFolderPicker}"</h2>
            <p className="folder-picker__desc">
              Choose a folder where the playbook will be scaffolded and executed.
              A <code>.converge/</code> directory will be created inside it.
            </p>
            <label className="folder-picker__label">
              <FolderOpen size={14} />
              Target folder
            </label>
            <input
              type="text"
              className="folder-picker__input"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="D:\my-project"
              autoFocus
            />
            {scaffoldError && (
              <p className="folder-picker__error">{scaffoldError}</p>
            )}
            <div className="folder-picker__actions">
              <button
                type="button"
                className="folder-picker__cancel"
                onClick={() => setShowFolderPicker(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="folder-picker__run"
                onClick={() => handleScaffoldAndRun(showFolderPicker, folderPath)}
                disabled={!folderPath.trim() || scaffolding !== null}
              >
                {scaffolding ? <Loader2 size={14} className="run-view__spin" /> : null}
                Scaffold & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
