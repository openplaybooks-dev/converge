'use client'

import { useState } from 'react'

export interface TreeNode {
  id: string
  title: string
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'blocked'
  href?: string
  children?: TreeNode[]
  meta?: React.ReactNode
}

export interface TaskTreeProps {
  nodes: TreeNode[]
  defaultExpandedDepth?: number
  onNodeClick?: (node: TreeNode) => void
}

// TODO: Status icons (○ pending, ▶ running, ✅ completed, ❌ failed)
// TODO: Collapse/expand state persisted in localStorage keyed by node id
// TODO: Indent guides (vertical lines) for deep trees
// TODO MVP: tree filtering by status not implemented
export function TaskTree({ nodes, defaultExpandedDepth = 1, onNodeClick }: TaskTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  function toggle(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function renderNode(node: TreeNode, depth: number): React.ReactNode {
    const isExpanded = expanded[node.id] ?? depth < defaultExpandedDepth
    return (
      <div key={node.id}>
        <div
          onClick={() => {
            if (node.children?.length) toggle(node.id)
            onNodeClick?.(node)
          }}
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/50 transition-colors`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {node.children?.length ? (
            <span className="text-xs text-muted-foreground w-4">{isExpanded ? '▼' : '▶'}</span>
          ) : (
            <span className="text-xs text-muted-foreground w-4" />
          )}
          <span className="text-sm">{node.title}</span>
          {node.meta && <span className="ml-auto">{node.meta}</span>}
        </div>
        {isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto py-2">
      {nodes.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No tasks found
        </div>
      ) : (
        nodes.map(node => renderNode(node, 0))
      )}
    </div>
  )
}