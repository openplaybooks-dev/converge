'use client'

export interface GanttRow {
  taskPath: string
  attempts: Array<{
    startedAt: string
    endedAt?: string
    status: 'running' | 'completed' | 'failed'
    label?: string
  }>
}

export interface SessionGanttProps {
  rows: GanttRow[]
  sessionStartedAt: string
  sessionEndedAt?: string
  onAttemptClick?: (taskPath: string, attemptIndex: number) => void
}

// TODO: Time axis ticks at 1m / 5m / 1h granularity depending on session duration
// TODO: Bar color by status (green/red/blue for completed/failed/running)
// TODO: Live session "now" line updates every second
// TODO: Virtualize y-axis for sessions with >100 rows
export function SessionGantt({
  rows,
  sessionStartedAt,
  sessionEndedAt,
  onAttemptClick,
}: SessionGanttProps) {
  const startMs = new Date(sessionStartedAt).getTime()
  const endMs = sessionEndedAt ? new Date(sessionEndedAt).getTime() : Date.now()
  const duration = endMs - startMs

  const now = sessionEndedAt ? endMs : Date.now()
  const nowOffset = now - startMs

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="relative h-8 bg-secondary/50 border-b border-border">
        {!sessionEndedAt && (
          <div
            className="absolute left-0 top-0 h-full w-0.5 bg-red-500 z-10"
            style={{ left: nowOffset }}
          />
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            No task events
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.taskPath} className="flex items-center border-b border-border/50 px-4 py-2">
              <div className="w-48 flex-shrink-0">
                <span className="font-mono text-xs text-muted-foreground">{row.taskPath}</span>
              </div>
              <div className="flex-1 relative h-6">
                {row.attempts.map((attempt, i) => {
                  const aStart = new Date(attempt.startedAt).getTime() - startMs
                  const aEnd = attempt.endedAt ? new Date(attempt.endedAt).getTime() - startMs : nowOffset
                  const left = (aStart / duration) * 100
                  const width = ((aEnd) - aStart) / duration * 100
                  const color =
                    attempt.status === 'completed' ? 'bg-green-500/60 hover:bg-green-500/80' :
                    attempt.status === 'failed' ? 'bg-red-500/60 hover:bg-red-500/80' :
                    'bg-blue-500/60 hover:bg-blue-500/80'
                  return (
                    <div
                      key={i}
                      onClick={() => onAttemptClick?.(row.taskPath, i)}
                      className={`absolute top-1 h-4 rounded cursor-pointer transition-colors ${color}`}
                      style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                      title={attempt.label}
                    />
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}