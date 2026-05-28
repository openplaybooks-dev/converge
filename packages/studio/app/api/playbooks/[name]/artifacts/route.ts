import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { resolveProjectDir } from '../../../../../src/lib/project-dir';

export const dynamic = 'force-dynamic';

function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    md: 'text/markdown',
    markdown: 'text/markdown',
    json: 'application/json',
    js: 'application/javascript',
    ts: 'application/typescript',
    css: 'text/css',
    html: 'text/html',
    htm: 'text/html',
    txt: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    ico: 'image/x-icon',
    pdf: 'application/pdf',
    yaml: 'text/yaml',
    yml: 'text/yaml',
  };
  return map[ext] ?? 'application/octet-stream';
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const url = new URL(request.url);
  const filePath = url.searchParams.get('path') ?? '';

  if (!filePath || filePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }

  // Resolve the file relative to the project workspace root
  const resolved = resolve(projectDir, filePath);

  // Security: ensure resolved path is within projectDir
  if (!resolved.startsWith(projectDir)) {
    return NextResponse.json({ error: 'Path outside workspace' }, { status: 403 });
  }

  if (!existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  try {
    const content = readFileSync(resolved);
    const contentType = getContentType(filePath);
    const isText = contentType.startsWith('text/') || contentType === 'application/json' || contentType === 'application/typescript' || contentType === 'application/javascript';

    return NextResponse.json({
      content: isText ? content.toString('utf-8') : undefined,
      base64: isText ? undefined : content.toString('base64'),
      contentType,
      size: content.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}