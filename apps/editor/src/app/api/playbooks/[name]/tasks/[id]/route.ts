import { NextResponse } from "next/server";
import { TaskWriteError, validatePatch, writeTaskPatch } from "@/lib/task-writer";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ name: string; id: string }> },
) {
  const { name, id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400 },
    );
  }

  try {
    const patch = validatePatch(body);
    const updated = await writeTaskPatch(name, id, patch);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof TaskWriteError) {
      const status =
        err.code === "playbook_not_found" || err.code === "task_not_found"
          ? 404
          : err.code === "path_escape"
            ? 403
            : 400;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status },
      );
    }
    throw err;
  }
}
