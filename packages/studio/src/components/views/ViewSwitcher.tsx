'use client'

export type ViewMode = 'table' | 'kanban' | 'tree' | 'gantt'

interface ViewSwitcherProps {
  mode: ViewMode
  onChange: (m: ViewMode) => void
  allowed: ViewMode[]
}

// TODO: Use Converge Studio's existing shadcn/Radix segmented-control primitive
export function ViewSwitcher({ mode, onChange, allowed }: ViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1">
      {allowed.map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`px-3 py-1 text-xs rounded ${
            mode === m
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  )
}