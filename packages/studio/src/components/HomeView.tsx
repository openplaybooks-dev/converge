import { useState, type ReactNode } from 'react';
import type { PlaybookSummary, Workspace } from '../types';
import { Plus, Compass, FolderOpen, Loader2 } from 'lucide-react';
import { navigate } from '../router';
import { updateWorkspaceMeta, emitWorkspaceChange } from '../lib/workspaces';
import { AddWorkspaceModal } from './AddWorkspaceModal';

interface Props {
  playbooks: PlaybookSummary[];
  onOpenPlaybook: (name: string) => void;
  onViewAllPlaybooks: () => void;
}

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
  // When set, the AddWorkspaceModal opens to pick a workspace for this example.
  const [pendingExample, setPendingExample] = useState<string | null>(null);

  async function scaffoldExampleIntoWorkspace(example: string, ws: Workspace, overwrite = false) {
    setScaffolding(example);
    try {
      const res = await fetch('/api/playbooks/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ example, targetDir: ws.path, overwrite }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Name conflict — ask user to confirm overwrite, then retry
        if (res.status === 409 && Array.isArray(data.conflicts) && data.conflicts.length > 0) {
          const msg =
            `The workspace "${ws.name}" already has these playbook(s):\n\n` +
            data.conflicts.map((c: string) => `  • ${c}`).join('\n') +
            `\n\nReplace with the version from "${example}"?`;
          if (confirm(msg)) {
            // Retry with overwrite=true
            return scaffoldExampleIntoWorkspace(example, ws, true);
          }
          setScaffolding(null);
          return;
        }
        alert(data.error || `Scaffold failed (${res.status})`);
        setScaffolding(null);
        return;
      }

      const pbName = data.playbooks?.[0] || 'default';

      // Refresh workspace metadata (playbook count likely changed)
      if (data.workspace) {
        updateWorkspaceMeta(ws.id, {
          name: data.workspace.name,
          description: data.workspace.description,
          playbookCount: data.workspace.playbookCount,
        });
        emitWorkspaceChange();
      }

      setScaffolding(null);
      navigate({ kind: 'playbook-run', playbookName: pbName, executionId: 'latest' });
    } catch (err: any) {
      alert(err.message);
      setScaffolding(null);
    }
  }

  function handleWorkspaceChosen(ws: Workspace) {
    // The modal already activated this workspace (setCurrentWorkspace).
    if (pendingExample) {
      const example = pendingExample;
      setPendingExample(null);
      // Defer one tick so the modal closes before navigation
      setTimeout(() => scaffoldExampleIntoWorkspace(example, ws), 50);
    }
  }

  function renderPlaybookCard(pb: PlaybookSummary, icon: ReactNode, desc: string, onClick: () => void) {
    return (
      <button
        key={pb.name}
        type="button"
        className="home-example-card"
        onClick={onClick}
      >
        {icon}
        <span className="home-example-card__name">{pb.name}</span>
        <span className="home-example-card__desc">{desc}</span>
      </button>
    );
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
          <div className="home-examples__grid">
            {recent.map((pb) => {
              const description = pb.description || `${pb.taskCount} task${pb.taskCount === 1 ? '' : 's'}`;
              return renderPlaybookCard(
                pb,
                <FolderOpen size={14} style={{ color: 'var(--cv-text-dim)' }} />,
                description,
                () => onOpenPlaybook(pb.name),
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
            renderPlaybookCard(
              { name: ex.name, description: ex.description, status: 'pending', taskCount: 0, updatedAt: '' },
              scaffolding === ex.name ? <Loader2 size={14} className="run-view__spin" /> : <FolderOpen size={14} style={{ color: 'var(--cv-text-dim)' }} />,
              ex.description,
              () => setPendingExample(ex.name),
            )
          ))}
        </div>
      </section>

      <AddWorkspaceModal
        open={pendingExample !== null}
        onClose={() => setPendingExample(null)}
        onAdded={handleWorkspaceChosen}
        title={pendingExample ? `Run "${pendingExample}"` : undefined}
        subtitle={
          pendingExample
            ? 'Pick a workspace to add this playbook to. You can use an existing one or create a fresh folder.'
            : undefined
        }
        openLabel="Use existing workspace"
        createLabel="Create new workspace"
      />
    </div>
  );
}
