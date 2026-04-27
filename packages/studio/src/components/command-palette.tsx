'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { useMissionControl } from '@/store'
import { useNavigateToPanel, usePrefetchPanel } from '@/lib/navigation'
import { Button } from '@/components/ui/button'

interface SearchResult {
  type: string
  id: number
  title: string
  subtitle?: string
  excerpt?: string
  created_at: number
  source?: 'command' | 'entity'
}

interface CommandGroup {
  id: string
  label: string
  items: SearchResult[]
}

const COMMAND_ITEMS: Array<{ action: () => void; title: string; subtitle: string }> = [
  { action: () => { window.location.href = '/playbooks/new' }, title: 'New playbook', subtitle: '/playbooks/new' },
  { action: () => navigateToPanel('runs'), title: 'View runs', subtitle: '/runs' },
  { action: () => { document.documentElement.setAttribute('data-theme', 'void') }, title: 'Toggle theme', subtitle: 'next-themes' },
  { action: () => navigateToPanel('settings'), title: 'Open settings', subtitle: '/settings' },
]

function navigateToPanel(panel: string) {
  // Dynamically import to avoid SSR issues and circular deps
  import('@/lib/navigation').then(m => m.useNavigateToPanel()())
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<CommandGroup[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([])
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const openPalette = useCallback(() => {
    setOpen(true)
    setQuery('')
    setGroups(buildStaticGroups())
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  // Global Cmd-K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPalette])

  const doSearch = useCallback(async (q: string) => {
    const staticGroups = buildStaticGroups()
    if (q.length < 2) {
      setGroups(staticGroups)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`)
      const data = await res.json()
      const entityResults: SearchResult[] = (data.results || []).map((r: SearchResult) => ({ ...r, source: 'entity' }))
      const tasksGroup = entityResults.filter(r => r.type === 'task')
      const runsGroup = entityResults.filter(r => r.type === 'activity')
      setGroups([
        ...staticGroups,
        ...(tasksGroup.length ? [{ id: 'tasks', label: 'Tasks', items: tasksGroup }] : []),
        ...(runsGroup.length ? [{ id: 'runs', label: 'Runs', items: runsGroup }] : []),
      ])
    } catch {
      setGroups(staticGroups)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    setSelectedIndex(0)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => doSearch(value), 250)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const flat = groups.flatMap(g => g.items)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flat[selectedIndex]
      if (item) executeItem(item)
    }
  }

  const executeItem = (item: SearchResult) => {
    setOpen(false)
    setQuery('')
    const cmd = COMMAND_ITEMS.find(c => c.title === item.title)
    if (cmd) {
      cmd.action()
      return
    }
    const typeToTab: Record<string, string> = {
      task: 'tasks', agent: 'agents', activity: 'activity',
      audit: 'audit', message: 'agents', notification: 'notifications',
      webhook: 'webhooks', pipeline: 'agents',
    }
    import('@/lib/navigation').then(m => m.useNavigateToPanel()(typeToTab[item.type] || 'overview'))
  }

  const typeIcons: Record<string, string> = {
    task: 'T', agent: 'A', activity: 'E', audit: 'S',
    message: 'M', notification: 'N', webhook: 'W', pipeline: 'P',
  }
  const typeColors: Record<string, string> = {
    task: 'bg-blue-500/20 text-blue-400',
    agent: 'bg-purple-500/20 text-purple-400',
    activity: 'bg-green-500/20 text-green-400',
    audit: 'bg-amber-500/20 text-amber-400',
    message: 'bg-cyan-500/20 text-cyan-400',
    notification: 'bg-red-500/20 text-red-400',
    webhook: 'bg-orange-500/20 text-orange-400',
    pipeline: 'bg-indigo-500/20 text-indigo-400',
  }

  const flatItems = groups.flatMap(g => g.items)

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] isolate" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/30" onClick={() => setOpen(false)} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[44rem] max-h-[min(78vh,40rem)] bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search playbooks, tasks, runs..."
              className="w-full h-9 px-3 rounded-md bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
          </div>
          <div className="max-h-[calc(min(78vh,40rem)-3.25rem)] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Searching...</div>
            ) : flatItems.length > 0 ? (
              groups.map(group => (
                <div key={group.id}>
                  <div className="px-3 py-1.5 text-2xs font-semibold text-muted-foreground uppercase">{group.label}</div>
                  {group.items.map((item, gi) => {
                    const globalIdx = flatItems.indexOf(item)
                    return (
                      <Button
                        key={`${item.type}-${item.id}-${gi}`}
                        ref={el => { resultRefs.current[globalIdx] = el }}
                        variant="ghost"
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`w-full text-left px-3 py-2 h-auto rounded-none justify-start items-start gap-2.5 ${
                          globalIdx === selectedIndex ? 'bg-secondary' : 'bg-card'
                        }`}
                      >
                        <span className={`text-2xs font-medium w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${typeColors[item.type] || 'bg-muted text-muted-foreground'}`}>
                          {typeIcons[item.type] || '?'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-foreground truncate">{item.title}</div>
                          {item.subtitle && <div className="text-2xs text-muted-foreground truncate">{item.subtitle}</div>}
                        </div>
                      </Button>
                    )
                  })}
                </div>
              ))
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No results</div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">Type to search</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function buildStaticGroups(): CommandGroup[] {
  return [
    {
      id: 'playbooks',
      label: 'Playbooks',
      items: [
        { type: 'command', id: -1, title: 'New playbook', subtitle: '/playbooks/new', created_at: Date.now() },
      ],
    },
    {
      id: 'tasks',
      label: 'Tasks',
      items: [],
    },
    {
      id: 'runs',
      label: 'Runs',
      items: [
        { type: 'command', id: -2, title: 'View runs', subtitle: '/runs', created_at: Date.now() },
      ],
    },
  ]
}
