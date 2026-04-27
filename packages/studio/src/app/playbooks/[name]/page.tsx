import { notFound } from 'next/navigation'
import { readPlaybook } from '@/lib/converge-adapter'
import PlaybookDetailTabs from '@/components/playbook-detail-tabs'

interface PageProps {
  params: Promise<{ name: string }>
}

export default async function PlaybookDetailPage({ params }: PageProps) {
  const { name } = await params

  let playbook: Awaited<ReturnType<typeof readPlaybook>>['parsed'] | null = null
  try {
    const result = await readPlaybook(name)
    playbook = result.parsed
  } catch {
    notFound()
  }

  if (!playbook) {
    notFound()
  }

  return (
    <div className="flex flex-col h-full">
      <PlaybookDetailTabs playbook={playbook} />
    </div>
  )
}
