import { NextResponse } from "next/server";
import { RunManagerError, stopRun } from "@/lib/run-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const status = await stopRun(name);
    return NextResponse.json(status);
  } catch (err) {
    if (err instanceof RunManagerError) {
      const status = err.code === "not_running" ? 404 : 500;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status },
      );
    }
    throw err;
  }
}
