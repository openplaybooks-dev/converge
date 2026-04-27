'use client'

import { useState, useEffect } from 'react'
import { StatRow, SignalPill } from '../widget-primitives'
import { listSessions } from '@/lib/converge-adapter/sessions'

function truncateId(id: string, len = 8): string {
  return id.length > len ? id.slice(0, len) + '…' : id
}

function ageLabel(startTime: string): string {
  const diff = Date.now() - new Date(startTime).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function statusTone(status?: string): 'success' | 'warning' | 'info' {
  switch (status) {
    case 'completed': return 'success'
    case 'failed': return 'warning'
    case 'running': return 'info'
    default: return 'info'
  }
}

export function RecentRunsWidget() {
  const [runs, setRuns] = useState<Array<{
    playbook: string
    sessionId: string
    startTime: string
    status?: string
  }>>([])

  useEffect(() => {
    async function load() {
      try {
        const sessions = await listSessions('default')
        setRuns(sessions.slice(0, 10))
      } catch {
        // No sessions yet
      }
    }
    load()
  }, [])

  if (runs.length === 0) {
    return (
      <div className="space-y-1">
        <StatRow label="No runs yet" value="—" />
        <StatRow label="Start a playbook to see runs here" value="" />
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {runs.map((run) => (
        <div
          key={`${run.playbook}/${run.sessionId}`}
          className="flex items-center gap-2 py-1 hover:bg-secondary/30 px-2 rounded cursor-pointer transition-smooth"
          onClick={() => window.location.href = `/runs/${run.playbook}/${run.sessionId}`}
        >
          <div className="flex-1 min-w-0">
            <StatRow
              label={run.playbook}
              value={truncateId(run.sessionId) + ' · ' + ageLabel(run.startTime)}
            />
          </div>
          <SignalPill
            label=""
            value={run.status ?? 'unknown'}
            tone={statusTone(run.status)}
          />
        </div>
      ))}
    </div>
  )
}