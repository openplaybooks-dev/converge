import { NextResponse } from 'next/server';
import { getProjectDir, setProjectDir } from '../../../src/lib/project-dir';

export async function GET() {
  return NextResponse.json({ projectDir: getProjectDir() });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.projectDir === 'string') {
    setProjectDir(body.projectDir);
    return NextResponse.json({ projectDir: getProjectDir() });
  }
  return NextResponse.json({ error: 'projectDir must be a string' }, { status: 400 });
}
