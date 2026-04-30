import { NextResponse } from "next/server";
import {
  RunManagerError,
  getRunStatus,
  startRun,
} from "@/lib/run-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  return NextResponse.json(getRunStatus(name));
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  try {
    const status = startRun(name);
    return NextResponse.json(status, { status: 202 });
  } catch (err) {
    if (err instanceof RunManagerError) {
      const status =
        err.code === "already_running"
          ? 409
          : err.code === "cli_not_found"
            ? 503
            : 500;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status },
      );
    }
    throw err;
  }
}
