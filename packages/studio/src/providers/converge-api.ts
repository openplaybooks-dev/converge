import type {
  PlaybookSummary,
  PlaybookDetail,
  RunState,
  Gap,
  JournalEvent,
  StudioSession,
  SkillSummary,
  ProviderInfo,
  TaskComment,
} from '../types';

import {
  MOCK_SESSIONS,
  MOCK_SKILLS,
  MOCK_PROVIDERS,
} from '../mock-data';
import { getCurrentWorkspace } from '../lib/workspaces';

const USE_MOCK = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('mock');

/**
 * Inject the current workspace path as a request header so the API
 * can resolve which `.converge/` directory to read from. This is the
 * only piece of "workspace context" the server sees — no server state.
 */
export function workspaceHeaders(): HeadersInit {
  const ws = getCurrentWorkspace();
  return ws?.path ? { 'X-Converge-Workspace': ws.path } : {};
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: workspaceHeaders() });
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

export async function listComments(playbookName: string, taskId?: string): Promise<TaskComment[]> {
  const url = `/api/playbooks/${encodeURIComponent(playbookName)}/comments${taskId ? `?taskId=${encodeURIComponent(taskId)}` : ''}`;
  const data = await fetchJson<{ comments: TaskComment[] }>(url);
  return data.comments ?? [];
}

export async function cleanPlaybook(playbookName: string): Promise<void> {
  const res = await fetch(`/api/playbooks/${encodeURIComponent(playbookName)}/clean`, {
    method: 'POST',
    headers: workspaceHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.url}: ${res.status}`);
  }
}

export async function addComment(
  playbookName: string,
  input: { taskId: string; body: string; kind: 'comment' | 'rework' },
): Promise<TaskComment> {
  const res = await fetch(`/api/playbooks/${encodeURIComponent(playbookName)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...workspaceHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API ${res.url}: ${res.status}`);
  }
  const data = await res.json();
  return data.comment as TaskComment;
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
