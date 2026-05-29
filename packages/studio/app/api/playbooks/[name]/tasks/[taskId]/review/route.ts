import { NextResponse } from 'next/server';
import {
  appendHumanReview,
  loadLatestHumanReview,
  type HumanReviewDecision,
} from '@openplaybooks/converge-core/task/review';
import { resolveProjectDir } from '../../../../../../../src/lib/project-dir';

export const dynamic = 'force-dynamic';

const VALID: HumanReviewDecision[] = ['approve', 'revise', 'reject'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string; taskId: string }> },
) {
  const { name, taskId } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }
  if (taskId.includes('/') || taskId.includes('..')) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }
  const latest = await loadLatestHumanReview(projectDir, name, taskId);
  return NextResponse.json(latest);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string; taskId: string }> },
) {
  const { name, taskId } = await params;
  const projectDir = resolveProjectDir(request);
  if (!projectDir) {
    return NextResponse.json({ error: 'CONVERGE_PROJECT_DIR not set' }, { status: 500 });
  }
  if (taskId.includes('/') || taskId.includes('..')) {
    return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
  }

  let body: { decision?: string; feedback?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const decision = body.decision as HumanReviewDecision;
  if (!VALID.includes(decision)) {
    return NextResponse.json(
      { error: `decision must be one of: ${VALID.join(', ')}` },
      { status: 400 },
    );
  }
  if ((decision === 'revise' || decision === 'reject') && !body.feedback?.trim()) {
    return NextResponse.json(
      { error: `${decision} requires a non-empty feedback string` },
      { status: 400 },
    );
  }

  const entry = await appendHumanReview(projectDir, name, taskId, decision, {
    feedback: body.feedback ?? '',
  });
  return NextResponse.json(entry);
}
