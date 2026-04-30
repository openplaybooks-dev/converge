import { NextResponse } from "next/server";
import { z } from "zod";
import { AiDraftError, draftPlaybook } from "@/lib/ai-draft";
import { PlaybookWriteError, writePlaybookDraft } from "@/lib/playbook-writer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120; // upstream call can take up to ~60s on cold cache

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

const RequestSchema = z.object({
  prompt: z.string().min(8).max(2000),
  slug: z.string().regex(SLUG).optional(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        message:
          err instanceof Error ? err.message : "Body did not match the schema",
      },
      { status: 400 },
    );
  }

  let draft;
  try {
    draft = await draftPlaybook(parsed);
  } catch (err) {
    if (err instanceof AiDraftError) {
      const status =
        err.code === "missing_api_key"
          ? 503
          : err.code === "rate_limited"
            ? 429
            : err.code === "upstream_error"
              ? 502
              : 422;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status },
      );
    }
    throw err;
  }

  let written;
  try {
    written = await writePlaybookDraft(draft);
  } catch (err) {
    if (err instanceof PlaybookWriteError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.code === "exists" ? 409 : 500 },
      );
    }
    throw err;
  }

  return NextResponse.json({
    ok: true,
    name: draft.name,
    description: draft.description,
    mode: draft.mode,
    taskCount: written.taskCount,
    playbookDir: written.playbookDir,
  });
}
