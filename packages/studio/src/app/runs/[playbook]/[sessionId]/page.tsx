'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { ViewSwitcher, type ViewMode } from '@/components/views/ViewSwitcher'
import { SessionGantt } from '@/components/views/SessionGantt'
import { TaskTree } from '@/components/views/TaskTree'
import { TableView } from '@/components/views/TableView'
import { LogViewerPanel } from '@/components/panels/log-viewer-panel'
import { ActivityFeedPanel } from '@/components/panels/activity-feed-panel'

const STATUS_PILL: Record<string, string> = {
  running: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_PILL[status] ?? 'bg-secondary text-muted-foreground'}`}>
      {status}
    </span>
  )
}

// Placeholder data — real data would come from the SSE stream
const MOCK_SESSION = {
  playbook: '',
  sessionId: '',
  status: 'running' as const,
  iterations: 1,
  sessionStartedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  sessionEndedAt: undefined,
}

const MOCK_GANTT_ROWS = [
  { taskPath: 'setup', attempts: [{ startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), endedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), status: 'completed' as const }] },
  { taskPath: 'build', attempts: [{ startedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(), endedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'completed' as const }] },
  { taskPath: 'test', attempts: [{ startedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), status: 'running' as const }] },
]

const MOCK_TREE_NODES = [
  { id: '1', title: 'setup', status: 'completed' as const, children: [] },
  { id: '2', title: 'build', status: 'completed' as const, children: [] },
  { id: '3', title: 'test', status: 'running' as const, children: [{ id: '3a', title: 'unit tests', status: 'completed' as const }, { id: '3b', title: 'integration tests', status: 'running' as const }] },
]

const TABLE_COLUMNS = [
  { key: 'task', label: 'Task' },
  { key: 'status', label: 'Status' },
  { key: 'duration', label: 'Duration' },
]

const MOCK_TABLE_ROWS = [
  { id: '1', task: 'setup', status: <StatusPill status="completed" />, duration: '60s' },
  { id: '2', task: 'build', status: <StatusPill status="completed" />, duration: '120s' },
  { id: '3', task: 'test', status: <StatusPill status="running" />, duration: '—' },
]

type PanelSide = 'log' | 'activity'

export default function SessionPage() {
  const params = useParams()
  const playbook = Array.isArray(params.playbook) ? params.playbook[0] : params.playbook
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId

  const [view, setView] = useState<ViewMode>('gantt')
  const [sidePanel, setSidePanel] = useState<PanelSide>('log')
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  // SSE subscription for live log / activity feed
  useEffect(() => {
    const url = `/api/runs/${playbook}/${sessionId}/stream`
    const es = new EventSource(url)
    setEventSource(es)
    return () => es.close()
  }, [playbook, sessionId])

  // Live indicator: subscribe to /api/events for running rows
  useEffect(() => {
    const es = new EventSource('/api/events')
    return () => es.close()
  }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">{playbook}</h1>
        <span className="text-muted-foreground font-mono text-sm">{sessionId}</span>
        <StatusPill status="running" />
        <span className="text-xs text-muted-foreground">iter 1</span>
        <div className="ml-auto">
          <ViewSwitcher
            mode={view}
            onChange={setView}
            allowed={['gantt', 'tree', 'table']}
          />
        </div>
      </div>

      {/* Main content + side panel */}
      <div className="flex flex-1 min-h-0">
        {/* View area */}
        <div className="flex-1 min-w-0">
          {view === 'gantt' && (
            <SessionGantt
              rows={MOCK_GANTT_ROWS}
              sessionStartedAt={MOCK_SESSION.sessionStartedAt}
              sessionEndedAt={MOCK_SESSION.sessionEndedAt}
            />
          )}
          {view === 'tree' && (
            <TaskTree nodes={MOCK_TREE_NODES} />
          )}
          {view === 'table' && (
            <TableView columns={TABLE_COLUMNS} rows={MOCK_TABLE_ROWS} />
          )}
        </div>

        {/* Resizable split pane — side panel */}
        <div className="w-80 border-l border-border flex flex-col">
          <div className="flex border-b border-border">
            <button
              onClick={() => setSidePanel('log')}
              className={`flex-1 px-3 py-2 text-xs ${sidePanel === 'log' ? 'bg-secondary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Logs
            </button>
            <button
              onClick={() => setSidePanel('activity')}
              className={`flex-1 px-3 py-2 text-xs ${sidePanel === 'activity' ? 'bg-secondary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Activity
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {sidePanel === 'log' ? <LogViewerPanel /> : <ActivityFeedPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}