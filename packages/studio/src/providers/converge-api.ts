import type {
  PlaybookSummary,
  PlaybookDetail,
  RunState,
  Gap,
  JournalEvent,
  StudioSession,
  SkillSummary,
  ProviderInfo,
} from '../types';

import {
  MOCK_SESSIONS,
  MOCK_SKILLS,
  MOCK_PROVIDERS,
} from '../mock-data';

const USE_MOCK = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mock');

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${url}: ${res.status}`);
  return res.json();
}

export async function listPlaybooks(): Promise<PlaybookSummary[]> {
  if (USE_MOCK) {
    const { MOCK_PLAYBOOKS } = await import('../mock-data');
    return MOCK_PLAYBOOKS;
  }
  return fetchJson('/api/playbooks');
}

export async function getPlaybook(name: string): Promise<PlaybookDetail | null> {
  if (USE_MOCK) {
    const { MOCK_PLAYBOOK_DETAIL } = await import('../mock-data');
    return MOCK_PLAYBOOK_DETAIL[name] ?? null;
  }
  return fetchJson(`/api/playbooks/${encodeURIComponent(name)}`);
}

export async function getRunState(playbookName: string): Promise<RunState | null> {
  if (USE_MOCK) {
    const { MOCK_RUN_STATE } = await import('../mock-data');
    if (MOCK_RUN_STATE.playbook === playbookName) return MOCK_RUN_STATE;
    return null;
  }
  return fetchJson(`/api/playbooks/${encodeURIComponent(playbookName)}/runstate`);
}

export async function listGaps(playbookName: string): Promise<Gap[]> {
  if (USE_MOCK) {
    const { MOCK_GAPS } = await import('../mock-data');
    return MOCK_GAPS.filter(g => g.scope.startsWith(playbookName));
  }
  return fetchJson(`/api/playbooks/${encodeURIComponent(playbookName)}/gaps`);
}

export async function listJournalEvents(playbookName: string): Promise<JournalEvent[]> {
  if (USE_MOCK) {
    const { MOCK_JOURNAL_EVENTS } = await import('../mock-data');
    return MOCK_JOURNAL_EVENTS.filter(e => e.scope.startsWith(playbookName));
  }
  return fetchJson(`/api/playbooks/${encodeURIComponent(playbookName)}/events?last=200`);
}

export async function getInventory(playbookName: string): Promise<{ goals: any[]; tasks: any[] }> {
  return fetchJson(`/api/playbooks/${encodeURIComponent(playbookName)}/inventory`);
}

export function listSessions(): Promise<StudioSession[]> {
  return Promise.resolve(MOCK_SESSIONS);
}

export function listSkills(): Promise<SkillSummary[]> {
  return Promise.resolve(MOCK_SKILLS);
}

export function listProviders(): Promise<ProviderInfo[]> {
  return Promise.resolve(MOCK_PROVIDERS);
}

export function submitReviewDecision(
  _taskId: string,
  _decision: string,
  _feedback: string,
): Promise<boolean> {
  return Promise.resolve(true);
}
