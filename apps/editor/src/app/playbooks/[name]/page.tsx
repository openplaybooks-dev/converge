import { notFound } from "next/navigation";
import { getPlaybookDetail } from "@/lib/core";
import { DesignerShell } from "@/components/designer/designer-shell";

export const dynamic = "force-dynamic";

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const detail = await getPlaybookDetail(name);
  if (!detail) notFound();

  return (
    <DesignerShell
      playbookName={detail.name}
      description={detail.description}
      templateDir={detail.templateDir}
      tasks={detail.tasks}
      artifacts={detail.artifacts}
      dataFlow={detail.dataFlow}
    />
  );
}
