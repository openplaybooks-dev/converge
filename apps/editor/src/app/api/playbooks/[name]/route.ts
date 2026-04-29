import { NextResponse } from "next/server";
import { getPlaybookDetail } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const detail = await getPlaybookDetail(name);
  if (!detail) {
    return NextResponse.json({ error: "playbook_not_found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
