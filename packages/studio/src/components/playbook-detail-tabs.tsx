'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'

interface Playbook {
  name: string
  description?: string
  config?: {
    mode?: string
    maxIterations?: number
    maxDuration?: number
  }
}

interface Run {
  id: string
  playbook: string
  status: string
  startedAt: number
  duration?: number
  iterations?: number
}

const statusColors: Record<string, string> = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  running: 'bg-yellow-500',
  pending: 'bg-gray-500',
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  )
}

export function OverviewTab({ playbook }: { playbook: Playbook }) {
  const t = useTranslations('playbookDetail')
  const [lastRun, setLastRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/playbooks/${playbook.name}/runs?limit=1`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.runs?.[0]) setLastRun(data.runs[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [playbook.name])

  const runConfig = playbook.config || {}

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <h4 className="text-lg font-medium text-foreground">{t('overview')}</h4>
        {playbook.description && (
          <p className="text-sm text-muted-foreground">{playbook.description}</p>
        )}
      </div>

      <div className="bg-surface-1/50 rounded-lg p-4 space-y-2">
        <h5 className="text-sm font-medium text-foreground mb-3">{t('runConfig')}</h5>
        <StatRow label={t('mode')} value={runConfig.mode || '—'} />
        <StatRow label={t('maxIterations')} value={String(runConfig.maxIterations ?? '—')} />
        <StatRow label={t('maxDuration')} value={runConfig.maxDuration ? `${runConfig.maxDuration}s` : '—'} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader variant="inline" label={t('loading')} />
        </div>
      ) : lastRun ? (
        <div className="bg-surface-1/50 rounded-lg p-4 space-y-2">
          <h5 className="text-sm font-medium text-foreground mb-3">{t('lastRun')}</h5>
          <StatRow label={t('timestamp')} value={new Date(lastRun.startedAt * 1000).toLocaleString()} />
          <StatRow label={t('duration')} value={lastRun.duration ? `${lastRun.duration}s` : '—'} />
          <StatRow label={t('status')} value={lastRun.status} />
          <StatRow label={t('iterations')} value={String(lastRun.iterations ?? '—')} />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">{t('noRuns')}</div>
      )}
    </div>
  )
}

export function TasksTab({ playbookName }: { playbookName: string }) {
  const t = useTranslations('playbookDetail')
  return (
    <div className="p-6">
      <h4 className="text-lg font-medium text-foreground mb-4">{t('tasks')}</h4>
      <p className="text-sm text-muted-foreground">{t('tasksDesc')}</p>
    </div>
  )
}

export function RunsTab({ playbookName }: { playbookName: string }) {
  const t = useTranslations('playbookDetail')
  const [triggering, setTriggering] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleTriggerRun = async () => {
    setTriggering(true)
    setStatus(null)
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbook: playbookName }),
      })
      if (!res.ok) throw new Error('Failed to trigger run')
      setStatus('Run triggered')
    } catch (err) {
      setStatus('Failed to trigger run')
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h4 className="text-lg font-medium text-foreground">{t('runs')}</h4>
        <Button size="sm" onClick={handleTriggerRun} disabled={triggering}>
          {triggering ? t('triggering') : t('triggerRun')}
        </Button>
      </div>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}

export function ConfigTab({ playbookName }: { playbookName: string }) {
  const t = useTranslations('playbookDetail')
  return (
    <div className="p-6">
      <h4 className="text-lg font-medium text-foreground mb-4">{t('config')}</h4>
      <p className="text-sm text-muted-foreground">{t('configDesc')}</p>
    </div>
  )
}

export default function PlaybookDetailTabs({ playbook }: { playbook: Playbook }) {
  const t = useTranslations('playbookDetail')
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tasks' | 'Runs' | 'Config'>('Overview')

  const tabs = ['Overview', 'Tasks', 'Runs', 'Config'] as const

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border sticky top-0 bg-background z-10 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(tab.toLowerCase())}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'Overview' && <OverviewTab playbook={playbook} />}
        {activeTab === 'Tasks' && <TasksTab playbookName={playbook.name} />}
        {activeTab === 'Runs' && <RunsTab playbookName={playbook.name} />}
        {activeTab === 'Config' && <ConfigTab playbookName={playbook.name} />}
      </div>
    </div>
  )
}
