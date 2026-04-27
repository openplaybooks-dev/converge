import React from 'react'

export type ConvergeEvent =
  | { kind: 'playbook.changed'; playbook: string; path: string; at: string }
  | { kind: 'task.changed'; playbook: string; taskPath: string; at: string }
  | { kind: 'session.started'; playbook: string; sessionId: string; at: string }
  | { kind: 'session.event'; playbook: string; sessionId: string; eventName: string; at: string }

export function useConvergeEvents(onEvent: (e: ConvergeEvent) => void): { connected: boolean } {
  const [connected, setConnected] = React.useState(false)

  React.useEffect(() => {
    const es = new EventSource('/api/events')

    es.onmessage = (messageEvent: MessageEvent) => {
      try {
        const event = JSON.parse(messageEvent.data as string) as ConvergeEvent
        onEvent(event)
      } catch {
        // Ignore malformed events
      }
    }

    // Track connection state via readyState
    const updateState = () => {
      setConnected(es.readyState === EventSource.OPEN)
    }

    es.onopen = updateState
    es.onerror = updateState

    // Set initial state
    updateState()

    return () => {
      es.close()
    }
  }, [onEvent])

  return { connected }
}