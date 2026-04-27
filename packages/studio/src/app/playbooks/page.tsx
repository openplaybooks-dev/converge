import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function PlaybooksPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold">Playbooks</h1>
        <Link href="/playbooks/new">
          <Button size="sm">+ New playbook</Button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-4 text-4xl">📋</div>
          <h2 className="text-lg font-semibold mb-1">Create your first playbook</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Playbooks let you define agent workflows with tasks, checks, and run configuration.
          </p>
          <Link href="/playbooks/new">
            <Button>Create playbook</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}