'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type RunMode = 'oneoff' | 'dispatch' | 'converge' | 'loop'

interface PlaybookInput {
  name: string
  description: string
  required: boolean
}

export default function NewPlaybookPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inputs, setInputs] = useState<PlaybookInput[]>([{ name: '', description: '', required: false }])
  const [mode, setMode] = useState<RunMode>('oneoff')
  const [maxTaskAttempts, setMaxTaskAttempts] = useState<number | ''>('')
  const [maxDuration, setMaxDuration] = useState('')
  const [resume, setResume] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addInput = () => {
    setInputs((prev) => [...prev, { name: '', description: '', required: false }])
  }

  const removeInput = (index: number) => {
    setInputs((prev) => prev.filter((_, i) => i !== index))
  }

  const updateInput = (index: number, field: keyof PlaybookInput, value: string | boolean) => {
    setInputs((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Playbook name is required.')
      return
    }

    const filteredInputs = inputs.filter((inp) => inp.name.trim() !== '')

    const payload: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || undefined,
      inputs: filteredInputs.length > 0
        ? Object.fromEntries(
            filteredInputs.map((inp) => [
              inp.name.trim(),
              { description: inp.description.trim() || undefined, required: inp.required },
            ])
          )
        : undefined,
      run: {
        mode,
        maxTaskAttempts: maxTaskAttempts !== '' ? Number(maxTaskAttempts) : undefined,
        maxDuration: maxDuration.trim() || undefined,
        resume,
      },
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.status === 201) {
        router.push(`/playbooks/${name.trim()}`)
        return
      }

      if (res.status === 400) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Invalid playbook spec.')
        return
      }

      setError('Failed to create playbook. Please try again.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/playbooks" className="text-muted-foreground hover:text-foreground text-sm">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">New Playbook</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-xl mx-auto">
          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1.5">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-playbook"
                pattern="[a-z0-9][a-z0-9-]*"
                className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1.5">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this playbook do?"
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth resize-none"
              />
            </div>

            {/* Inputs */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">
                  Inputs <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={addInput}
                  className="text-xs text-primary hover:text-primary/80 underline"
                >
                  + Add input
                </button>
              </div>
              <div className="space-y-3">
                {inputs.map((inp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <input
                      type="text"
                      value={inp.name}
                      onChange={(e) => updateInput(i, 'name', e.target.value)}
                      placeholder="INPUT_NAME"
                      className="flex-1 h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth font-mono"
                    />
                    <input
                      type="text"
                      value={inp.description}
                      onChange={(e) => updateInput(i, 'description', e.target.value)}
                      placeholder="Description"
                      className="flex-1 h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                    />
                    <label className="flex items-center gap-1.5 h-10 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inp.required}
                        onChange={(e) => updateInput(i, 'required', e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                      />
                      Required
                    </label>
                    {inputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeInput(i)}
                        className="h-10 px-2 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Run config */}
            <div className="space-y-4 rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium text-foreground">Run Configuration</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mode" className="block text-sm font-medium text-foreground mb-1.5">
                    Mode
                  </label>
                  <select
                    id="mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as RunMode)}
                    className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                  >
                    <option value="oneoff">One-off</option>
                    <option value="dispatch">Dispatch</option>
                    <option value="converge">Converge</option>
                    <option value="loop">Loop</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="maxTaskAttempts" className="block text-sm font-medium text-foreground mb-1.5">
                    Max Task Attempts
                  </label>
                  <input
                    id="maxTaskAttempts"
                    type="number"
                    value={maxTaskAttempts}
                    onChange={(e) => setMaxTaskAttempts(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="3"
                    min={1}
                    className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                  />
                </div>

                <div>
                  <label htmlFor="maxDuration" className="block text-sm font-medium text-foreground mb-1.5">
                    Max Duration
                  </label>
                  <input
                    id="maxDuration"
                    type="text"
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(e.target.value)}
                    placeholder="e.g. 1h, 30m"
                    className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-smooth"
                  />
                </div>

                <div className="flex items-center h-10 gap-2">
                  <input
                    id="resume"
                    type="checkbox"
                    checked={resume}
                    onChange={(e) => setResume(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/50"
                  />
                  <label htmlFor="resume" className="text-sm text-foreground cursor-pointer">
                    Resume on failure
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting} size="lg">
                {submitting ? 'Creating...' : 'Create playbook'}
              </Button>
              <Link href="/playbooks">
                <Button type="button" variant="secondary" size="lg">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
