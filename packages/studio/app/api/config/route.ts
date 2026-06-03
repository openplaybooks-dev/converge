import { NextResponse } from "next/server";
import {
  getProjectDir,
  setProjectDir,
  resolveProjectDir,
} from "../../../src/lib/project-dir";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return NextResponse.json({ projectDir: resolveProjectDir(request) });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (typeof body.projectDir === "string") {
    setProjectDir(body.projectDir);
    return NextResponse.json({ projectDir: getProjectDir() });
  }
  return NextResponse.json(
    { error: "projectDir must be a string" },
    { status: 400 },
  );
}
