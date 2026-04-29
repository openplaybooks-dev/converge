import { NextResponse } from "next/server";
import { listPlaybooks } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET() {
  const { root, sources } = await listPlaybooks();
  return NextResponse.json({
    root,
    playbooks: sources.map((src) => ({
      name: src.def.name,
      description: src.def.description ?? null,
      mode: src.def.run?.mode ?? "oneoff",
      tasks: src.def.tasks?.length ?? 0,
      builtin: src.builtin,
      templateDir: src.templateDir,
    })),
  });
}
