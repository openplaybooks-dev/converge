'use client';

export interface KanbanItem {
  id: string;
  title: string;
  status: string;
  subtitle?: string;
  href?: string;
  meta?: React.ReactNode;
}

export interface KanbanColumn {
  key: string;
  label: string;
  color?: string;
}

export interface KanbanBoardProps {
  items: KanbanItem[];
  columns: KanbanColumn[];
  onItemClick?: (item: KanbanItem) => void;
}

// TODO MVP: drag-and-drop reorder not implemented — kanban is read-only
export function KanbanBoard({ items, columns, onItemClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 h-full overflow-x-auto">
      {columns.map((col) => {
        const colItems = items.filter(item => item.status === col.key)
        return (
          <div key={col.key} className="flex flex-col min-w-[240px] flex-1">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color || '#666' }} />
              <span className="text-sm font-medium">{col.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{colItems.length}</span>
            </div>
            <div className="flex-1 overflow-auto py-2">
              {colItems.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  No items
                </div>
              ) : (
                colItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => onItemClick?.(item)}
                    className="px-3 py-2 mb-2 bg-secondary/50 rounded cursor-pointer hover:bg-secondary transition-colors"
                  >
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</div>
                    )}
                    {item.meta && (
                      <div className="mt-1">{item.meta}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}