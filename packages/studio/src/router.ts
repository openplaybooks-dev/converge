import { useEffect, useState } from 'react';

import type { Route, EntryHomeView } from './types';

export type { Route, EntryHomeView };

export function parseRoute(pathname: string): Route {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { kind: 'home', view: 'home' };
  if (parts[0] === 'onboarding') {
    return { kind: 'home', view: 'onboarding' };
  }
  if (parts[0] === 'playbooks') {
    if (parts[1]) {
      const playbookName = decodeURIComponent(parts[1]);
      if (parts[2] === 'tasks' && parts[3]) {
        return { kind: 'playbook', playbookName, taskId: decodeURIComponent(parts[3]) };
      }
      if (parts[2] === 'sessions' && parts[3]) {
        return { kind: 'playbook-plan', playbookName, sessionId: decodeURIComponent(parts[3]) };
      }
      if (parts[2] === 'run') {
        return { kind: 'playbook-run', playbookName, executionId: 'latest' };
      }
      if (parts[2] === 'plan') {
        return { kind: 'playbook-plan', playbookName, sessionId: 'current' };
      }
      if (parts[2] === 'workspace') {
        return { kind: 'playbook-workspace', playbookName };
      }
      return { kind: 'playbook', playbookName, taskId: null };
    }
    return { kind: 'home', view: 'playbooks' };
  }
  if (parts[0] === 'runs') {
    return { kind: 'home', view: 'runs' };
  }
  if (parts[0] === 'skills') {
    if (parts[1]) {
      return { kind: 'skill-detail', skillId: decodeURIComponent(parts[1]) };
    }
    return { kind: 'home', view: 'skills' };
  }
  if (parts[0] === 'providers') {
    return { kind: 'home', view: 'providers' };
  }
  return { kind: 'home', view: 'home' };
}

export function buildPath(route: Route): string {
  if (route.kind === 'home') {
    if (route.view === 'onboarding') return '/onboarding';
    if (route.view === 'playbooks') return '/playbooks';
    if (route.view === 'runs') return '/runs';
    if (route.view === 'skills') return '/skills';
    if (route.view === 'providers') return '/providers';
    return '/';
  }
  if (route.kind === 'playbook') {
    const name = encodeURIComponent(route.playbookName);
    if (route.taskId) {
      return `/playbooks/${name}/tasks/${encodeURIComponent(route.taskId)}`;
    }
    return `/playbooks/${name}`;
  }
  if (route.kind === 'playbook-plan') {
    const name = encodeURIComponent(route.playbookName);
    if (route.sessionId === 'current') {
      return `/playbooks/${name}/plan`;
    }
    return `/playbooks/${name}/sessions/${encodeURIComponent(route.sessionId)}`;
  }
  if (route.kind === 'playbook-run') {
    return `/playbooks/${encodeURIComponent(route.playbookName)}/run`;
  }
  if (route.kind === 'playbook-workspace') {
    return `/playbooks/${encodeURIComponent(route.playbookName)}/workspace`;
  }
  if (route.kind === 'skill-detail') {
    return `/skills/${encodeURIComponent(route.skillId)}`;
  }
  return '/';
}

export function navigate(route: Route, opts: { replace?: boolean } = {}): void {
  const target = buildPath(route);
  const current = window.location.pathname;
  if (target === current) return;
  if (opts.replace) {
    window.history.replaceState(null, '', target);
  } else {
    window.history.pushState(null, '', target);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname));
  useEffect(() => {
    const onPop = () => setRoute(parseRoute(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return route;
}
