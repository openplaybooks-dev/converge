import { useMemo } from 'react';
import { navigate, type Route } from '../router';
import type { PlaybookSummary } from '../types';

interface Props {
  route: Route;
  playbooks?: PlaybookSummary[];
}

export function WorkspaceTabsBar({ route }: Props) {
  const label = useMemo(() => {
    if (route.kind === 'playbook') return route.playbookName;
    if (route.kind === 'playbook-run') return `Run: ${route.playbookName}`;
    if (route.kind === 'playbook-plan') return `Plan: ${route.playbookName}`;
    if (route.kind === 'skill-detail') return `Skill: ${route.skillId}`;
    if (route.kind === 'home') {
      const labels: Record<string, string> = {
        home: 'Home',
        playbooks: 'Playbooks',
        runs: 'Runs',
        skills: 'Skills',
        providers: 'Providers',
        onboarding: 'Welcome',
      };
      return labels[route.view] ?? 'Home';
    }
    return 'Home';
  }, [route]);

  return (
    <header className="workspace-tabs-chrome app-chrome-header">
      <div className="workspace-tabs-strip">
        <button
          type="button"
          className="workspace-tab is-active"
          onClick={() => navigate({ kind: 'home', view: 'home' })}
        >
          <span className="workspace-tab__main">
            <span className="workspace-tab__label">{label}</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export function openWorkspaceTab(_route: Route) {}
