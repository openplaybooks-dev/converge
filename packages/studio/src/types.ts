export type TaskStatus = 'pending' | 'running' | 'pass' | 'error' | 'blocked' | 'skipped' | 'seeded';

export type TaskMode = 'leaf' | 'spawner' | 'converger' | 'gateway';

export type GapType =
  | 'plan'
  | 'blocker'
  | 'output'
  | 'check-failed'
  | 'corrupted'
  | 'systemic'
  | 'user-question'
  | 'insufficient-evidence'
  | 'contradictory-finding'
  | 'untested-hypothesis'
  | 'definition';

export type GapLevel = 'project' | 'epic' | 'task';

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';

export type EventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'ITERATION_START'
  | 'ITERATION_COMPLETE'
  | 'TASK_START'
  | 'TASK_COMPLETE'
  | 'TASK_FAILED'
  | 'TASK_CRASH'
  | 'GAP_DETECTED'
  | 'GAP_RESOLVED'
  | 'CHECK_RUN'
  | 'CHECK_PASSED'
  | 'CHECK_FAILED'
  | 'AGENT_START'
  | 'AGENT_COMPLETE'
  | 'AGENT_FAILED'
  | 'AWAITING_USER_INPUT'
  | 'USER_INPUT_RECEIVED'
  | 'CORRECTION_LOOP_START'
  | 'CORRECTION_ATTEMPTED'
  | 'CORRECTION_VERIFIED';

export type SessionStatus = 'idle' | 'planning' | 'awaiting-feedback' | 'publishing' | 'published' | 'failed';

export type GoalStatus = 'candidate' | 'active' | 'rejected' | 'stalled';

export type RunStatusKind = 'running' | 'complete' | 'error';

export type EntryHomeView = 'home' | 'onboarding' | 'playbooks' | 'runs' | 'skills' | 'providers';

export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  output?: string;
}

export interface AttemptDetail {
  attempt: number;
  status: TaskStatus;
  durationMs: number;
  checkResults?: CheckResult[];
  error?: string;
}

export interface TaskNode {
  id: string;
  title: string;
  status: TaskStatus;
  mode: TaskMode;
  dependsOn: string[];
  dependedOnBy: string[];
  inputs: string[];
  outputs: string[];
  checks: CheckResult[];
  attempts: AttemptDetail[];
  spawnedChildren: string[];
  dagType?: string;
}

export interface PlaybookGoal {
  id: string;
  description: string;
  status: GoalStatus;
  checks: string[];
}

export interface RunConfig {
  maxTaskAttempts?: number;
  workers?: number;
  maxIterations?: number;
  maxDuration?: string;
}

export interface PlaybookSummary {
  name: string;
  description: string;
  status: string;
  updatedAt: string;
  taskCount: number;
}

export interface PlaybookDetail extends PlaybookSummary {
  tasks: TaskNode[];
  goals: PlaybookGoal[];
  runConfig: RunConfig;
}

export interface RunState {
  executionId: string;
  playbook: string;
  status: RunStatusKind;
  generatedAt: string;
  totalNodes: number;
  nodes: TaskNode[];
}

export interface Gap {
  id: string;
  type: GapType;
  level: GapLevel;
  scope: string;
  description: string;
  detected: string;
  resolved: boolean;
  severity: GapSeverity;
}

export interface JournalEvent {
  timestamp: string;
  eventType: EventType;
  level: GapLevel;
  scope: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface FeedbackEntry {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

export interface StudioSession {
  id: string;
  name: string;
  status: SessionStatus;
  goal: string;
  createdAt: string;
  feedbackHistory: FeedbackEntry[];
}

export interface HumanReviewHandoff {
  taskId: string;
  playbookName: string;
  artifact?: string;
  decision?: 'approve' | 'revise' | 'reject';
  feedback?: string;
}

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  model?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface StudioConfig {
  theme: 'system' | 'light' | 'dark';
  accentColor?: string;
  convergePath?: string;
  providers?: Record<string, ProviderConfig>;
}

export type Route =
  | { kind: 'home'; view: EntryHomeView }
  | { kind: 'playbook'; playbookName: string; sessionId?: string | null; taskId: string | null }
  | { kind: 'playbook-plan'; playbookName: string; sessionId: string }
  | { kind: 'playbook-run'; playbookName: string; executionId: string }
  | { kind: 'skill-detail'; skillId: string };
