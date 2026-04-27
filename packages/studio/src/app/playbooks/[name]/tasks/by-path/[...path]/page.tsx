'use client'

import { useState } from 'react'

interface Frontmatter {
  id: string
  title: string
  dependencies: string[]
  outputs: string[]
  checks: string[]
}

interface PageProps {
  params: Promise<{ name: string; path: string[] }>
}

export default function TaskEditorPage({ params }: PageProps) {
  const [frontmatter, setFrontmatter] = useState<Frontmatter>({
    id: '',
    title: '',
    dependencies: [],
    outputs: [],
    checks: [],
  })
  const [markdown, setMarkdown] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const resolvedParams = { name: 'example', path: ['tasks', 'example'] } // placeholder

  const handleSave = async () => {
    setStatus('saving')
    try {
      const response = await fetch(
        `/api/playbooks/${resolvedParams.name}/tasks/by-path/${resolvedParams.path.join('/')}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontmatter, markdown }),
        }
      )
      if (response.ok) {
        setStatus('saved')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  const handleReset = () => {
    setFrontmatter({ id: '', title: '', dependencies: [], outputs: [], checks: [] })
    setMarkdown('')
  }

  const handleResetCheckpoint = async () => {
    await fetch(
      `/api/playbooks/${resolvedParams.name}/task-reset/${resolvedParams.path.join('/')}`,
      { method: 'POST' }
    )
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 p-6 border-r border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Frontmatter</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">ID</label>
            <input
              value={frontmatter.id}
              onChange={(e) => setFrontmatter({ ...frontmatter, id: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={frontmatter.title}
              onChange={(e) => setFrontmatter({ ...frontmatter, title: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dependencies (comma-separated)</label>
            <input
              value={frontmatter.dependencies.join(', ')}
              onChange={(e) =>
                setFrontmatter({
                  ...frontmatter,
                  dependencies: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Outputs (comma-separated)</label>
            <input
              value={frontmatter.outputs.join(', ')}
              onChange={(e) =>
                setFrontmatter({
                  ...frontmatter,
                  outputs: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Checks (comma-separated)</label>
            <input
              value={frontmatter.checks.join(', ')}
              onChange={(e) =>
                setFrontmatter({
                  ...frontmatter,
                  checks: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="w-1/2 p-6 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Markdown Body</h2>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          className="flex-1 w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleResetCheckpoint}
            className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            Reset checkpoint
          </button>
        </div>
        {status === 'saved' && <p className="text-green-600 text-sm mt-2">Saved successfully</p>}
        {status === 'error' && <p className="text-red-600 text-sm mt-2">Failed to save</p>}
      </div>
    </div>
  )
}