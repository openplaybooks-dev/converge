import { useState, useEffect } from "react";
import { useRoute } from "./router";
import type {
  PlaybookSummary,
  SkillSummary,
  ProviderInfo,
  StudioConfig,
} from "./types";
import {
  listPlaybooks,
  listSkills,
  listProviders,
} from "./providers/converge-api";
import { EntryView } from "./components/EntryView";
import { PlaybookWorkspace } from "./components/PlaybookWorkspace";
import { getCurrentWorkspace, onWorkspaceChange } from "./lib/workspaces";

export function App() {
  const route = useRoute();
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  const config: StudioConfig = { theme: "light" };

  // Hydrate workspace id from localStorage on mount, and listen for changes
  useEffect(() => {
    setWorkspaceId(getCurrentWorkspace()?.id ?? null);
    return onWorkspaceChange(() => {
      setWorkspaceId(getCurrentWorkspace()?.id ?? null);
    });
  }, []);

  // Re-fetch top-level data whenever the workspace changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [pb, sk, prov] = await Promise.all([
          listPlaybooks(),
          listSkills(),
          listProviders(),
        ]);
        if (cancelled) return;
        setPlaybooks(pb);
        setSkills(sk);
        setProviders(prov);
      } catch (err) {
        console.error("Failed to load data:", err);
        if (!cancelled) setPlaybooks([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // All playbook views use the rich workspace UI.
  // Pass workspaceId as `key` so the component fully remounts on workspace switch.
  const wsKey = workspaceId || "none";
  if (route.kind === "playbook" || route.kind === "playbook-workspace") {
    return (
      <PlaybookWorkspace
        key={`${wsKey}:${route.playbookName}`}
        playbookName={route.playbookName}
      />
    );
  }

  if (route.kind === "playbook-run") {
    return (
      <PlaybookWorkspace
        key={`${wsKey}:${route.playbookName}:run`}
        playbookName={route.playbookName}
        autoRun
      />
    );
  }

  return (
    <EntryView
      playbooks={playbooks}
      skills={skills}
      providers={providers}
      config={config}
      loading={loading}
    />
  );
}

export default App;
