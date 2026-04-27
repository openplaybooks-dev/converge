'use client'

import {
  QuickAction,
  SpawnActionIcon,
  LogActionIcon,
  TaskActionIcon,
  MemoryActionIcon,
} from '../widget-primitives'

function navigateToTab(tab: string) {
  window.location.href = `/${tab}`
}

function navigateToExternal(href: string) {
  window.open(href, '_blank', 'noopener,noreferrer')
}

export function QuickActionsWidget() {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <QuickAction
        label="New playbook"
        desc="Create a new converge playbook"
        tab="/playbooks/new"
        icon={<SpawnActionIcon />}
        onNavigate={(tab) => navigateToTab(tab)}
      />
      <QuickAction
        label="View all runs"
        desc="Browse all session runs"
        tab="/runs"
        icon={<LogActionIcon />}
        onNavigate={(tab) => navigateToTab(tab)}
      />
      <QuickAction
        label="Open settings"
        desc="Configure converge"
        tab="/settings"
        icon={<TaskActionIcon />}
        onNavigate={(tab) => navigateToTab(tab)}
      />
      <QuickAction
        label="Documentation"
        desc="Converge docs and guides"
        tab="https://converge.dev/docs"
        icon={<MemoryActionIcon />}
        onNavigate={(tab) => navigateToExternal(tab)}
      />
    </section>
  )
}