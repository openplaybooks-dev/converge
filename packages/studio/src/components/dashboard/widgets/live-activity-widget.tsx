'use client'

import { useState, useEffect, useRef } from 'react'
import { LogRow, type LogLike } from '../widget-primitives'
import { useConvergeEvents, type ConvergeEvent } from '@/lib/use-converge-events'

function eventToLog(e: ConvergeEvent): LogLike {
  let message: string = e.kind
  let level: LogLike['level'] = 'info'
  let source = e.playbook ?? ''

  switch (e.kind) {
    case 'session.started':
      message = 'Session started'
      break
    case 'session.event':
      message = e.eventName
      break
    case 'playbook.changed':
      message = `Playbook changed: ${e.path}`
      break
    case 'task.changed':
      message = `Task changed: ${e.taskPath}`
      break
  }

  return {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    level,
    source,
    message,
  }
}

export function LiveActivityWidget() {
  const [events, setEvents] = useState<LogLike[]>([])
  const [idle, setIdle] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useConvergeEvents((e) => {
    setEvents(prev => {
      const next = [eventToLog(e), ...prev].slice(0, 40)
      return next
    })
    setIdle(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 60_000)
  })

  useEffect(() => {
    idleTimer.current = setTimeout(() => setIdle(true), 60_000)
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  return (
    <div className="space-y-2">
      {/* Pulsing green dot */}
      <div className="flex items-center gap-2">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      {idle && events.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">All quiet</div>
      ) : (
        <div className="space-y-0 max-h-48 overflow-y-auto">
          {events.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  )
}