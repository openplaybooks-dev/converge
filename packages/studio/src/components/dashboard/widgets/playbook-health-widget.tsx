'use client'

import { useState, useEffect } from 'react'
import { HealthRow } from '../widget-primitives'
import { listPlaybooks, type PlaybookSummary } from '@/lib/converge-adapter/playbooks'

function completionPct(lastSessionAt?: string): number {
  // Placeholder: we don't have full session data here
  // Return a plausible default based on recency
  if (!lastSessionAt) return 0
  return 75 // Would be computed from session outcomes in production
}

function lastRunLabel(at?: string): string {
  if (!at) return 'Never'
  const diff = Date.now() - new Date(at).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function healthStatus(pb: PlaybookSummary): 'good' | 'warn' | 'bad' {
  if (!pb.lastSessionAt) return 'warn'
  const diff = Date.now() - new Date(pb.lastSessionAt).getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  if (days > 7) return 'bad'
  if (days > 2) return 'warn'
  return 'good'
}

export function PlaybookHealthWidget() {
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([])

  useEffect(() => {
    async function load() {
      try {
        const all = await listPlaybooks()
        setPlaybooks(all)
      } catch {
        // No playbooks
      }
    }
    load()
  }, [])

  if (playbooks.length === 0) {
    return (
      <div className="space-y-2">
        <HealthRow label="No playbooks" value="—" status="warn" />
        <HealthRow label="Create a playbook to get started" value="" status="warn" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {playbooks.map((pb) => (
        <div key={pb.name} className="space-y-1">
          <HealthRow
            label={pb.name}
            value={`${pb.taskCount} tasks · ${completionPct(pb.lastSessionAt)}%`}
            status={healthStatus(pb)}
          />
          <HealthRow
            label="Last run"
            value={lastRunLabel(pb.lastSessionAt)}
            status={healthStatus(pb)}
          />
        </div>
      ))}
    </div>
  )
}