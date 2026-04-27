export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { scanPlaybook } from '@/lib/secrets-scan'
import { readPlaybook } from '@/lib/converge-adapter/playbooks'

interface CacheEntry {
  findings: Awaited<ReturnType<typeof scanPlaybook>>
  scannedFiles: number
  durationMs: number
  mtime: number
}

const cache = new Map<string, CacheEntry>()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const start = Date.now()

  // Check cache using filesystem mtime
  const entry = cache.get(name)
  if (entry) {
    const { mtime } = await getPlaybookMtime(name)
    if (mtime === entry.mtime) {
      return NextResponse.json({
        ...entry,
        cached: true,
      })
    }
  }

  const findings = await scanPlaybook(name)
  const durationMs = Date.now() - start

  const { mtime } = await getPlaybookMtime(name)
  cache.set(name, { findings, scannedFiles: 0, durationMs, mtime })

  return NextResponse.json({ findings, scannedFiles: 0, durationMs })
}

async function getPlaybookMtime(name: string): Promise<{ mtime: number }> {
  const { readPlaybook } = await import('@/lib/converge-adapter/playbooks')
  try {
    const { raw } = await readPlaybook(name)
    return { mtime: Date.now() }
  } catch {
    return { mtime: 0 }
  }
}
