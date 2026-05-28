import { useState, useEffect } from 'react';
import { useRoute, navigate } from './router';
import type { PlaybookSummary, SkillSummary, ProviderInfo, StudioConfig } from './types';
import { listPlaybooks, listSkills, listProviders } from './providers/converge-api';
import { EntryView } from './components/EntryView';
import { ProjectView } from './components/ProjectView';
import { PlaybookWorkspace } from './components/PlaybookWorkspace';

export function App() {
  const route = useRoute();
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const config: StudioConfig = { theme: 'light' };

  useEffect(() => {
    let cancelled = false;
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
        console.error('Failed to load data:', err);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (route.kind === 'playbook-workspace') {
    return (
      <PlaybookWorkspace playbookName={route.playbookName} />
    );
  }

  if (route.kind === 'playbook-run') {
    return (
      <ProjectView
        playbookName={route.playbookName}
        autoRun
      />
    );
  }

  if (route.kind === 'playbook') {
    return (
      <ProjectView
        playbookName={route.playbookName}
        taskId={route.taskId}
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
