'use client'

import { useState } from 'react'
import { ViewSwitcher, type ViewMode } from '@/components/views/ViewSwitcher'
import { TableView } from '@/components/views/TableView'
import { KanbanBoard } from '@/components/views/KanbanBoard'
import { EmptyStateLaunchpad } from '@/components/dashboard/empty-state-launchpad'

// Placeholder: real data would come from an API or store
const MOCK_RUNS = [
  {
    id: 'run-001',
    playbook: 'deploy-stack',
    sessionId: 'sess-abc123',
    startTime: '2026-04-26T10:00:00Z',
    duration: '12m 34s',
    iterations: 3,
    status: 'completed',
  },
  {
    id: 'run-002',
    playbook: 'test-suite',
    sessionId: 'sess-def456',
    startTime: '2026-04-26T09:45:00Z',
    duration: '4m 12s',
    iterations: 1,
    status: 'failed',
  },
  {
    id: 'run-003',
    playbook: 'build-artifacts',
    sessionId: 'sess-ghi789',
    startTime: '2026-04-26T09:30:00Z',
    duration: 'running',
    iterations: 2,
    status: 'running',
  },
]

const STATUS_PILL: Record<string, string> = {
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_PILL[status] ?? 'bg-secondary text-muted-foreground'}`}>
      {status}
      {status === 'running' && (
        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      )}
    </span>
  )
}

const TABLE_COLUMNS = [
  { key: 'playbook', label: 'Playbook' },
  { key: 'sessionId', label: 'Session' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'duration', label: 'Duration' },
  { key: 'iterations', label: 'Iters' },
  { key: 'status', label: 'Status' },
]

function toTableRows(runs: typeof MOCK_RUNS) {
  return runs.map(r => ({
    id: r.id,
    playbook: r.playbook,
    sessionId: r.sessionId,
    startTime: new Date(r.startTime).toLocaleTimeString(),
    duration: r.duration,
    iterations: r.iterations,
    status: <StatusPill status={r.status} />,
  }))
}

const KANBAN_COLUMNS = [
  { key: 'running', label: 'Running', color: '#3b82f6' },
  { key: 'completed', label: 'Completed', color: '#22c55e' },
  { key: 'failed', label: 'Failed', color: '#ef4444' },
]

function toKanbanItems(runs: typeof MOCK_RUNS) {
  return runs.map(r => ({
    id: r.id,
    title: r.playbook,
    subtitle: r.sessionId,
    status: r.status,
    meta: <StatusPill status={r.status} />,
  }))
}

export default function RunsPage() {
  const [view, setView] = useState<ViewMode>('table')

  if (MOCK_RUNS.length === 0) {
    return (
      <div className="p-6">
        <EmptyStateLaunchpad agentCount={0} taskCount={0} onNavigate={() => {}} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Runs</h1>
        <ViewSwitcher
          mode={view}
          onChange={setView}
          allowed={['table', 'kanban']}
        />
      </div>
      <div className="flex-1 overflow-auto">
        {view === 'table' && (
          <TableView
            columns={TABLE_COLUMNS}
            rows={toTableRows(MOCK_RUNS)}
          />
        )}
        {view === 'kanban' && (
          <KanbanBoard
            items={toKanbanItems(MOCK_RUNS)}
            columns={KANBAN_COLUMNS}
          />
        )}
      </div>
    </div>
  )
}