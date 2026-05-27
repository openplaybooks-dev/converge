import type { PlaybookSummary } from '../types';
import { navigate } from '../router';
import { Clock, Play, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  playbooks: PlaybookSummary[];
}

export function RoutinesSection({ playbooks }: Props) {
  const withRuns = playbooks.filter((pb) => pb.status !== 'pending');

  if (withRuns.length === 0) return null;

  return (
    <section className="routines-section">
      <h3 className="routines-section__title">Recent Runs</h3>
      <div className="routines-section__list">
        {withRuns.slice(0, 5).map((pb) => (
          <button
            key={pb.name}
            type="button"
            className="routines-section__item"
            onClick={() =>
              navigate({
                kind: 'playbook-run',
                playbookName: pb.name,
                executionId: 'latest',
              })
            }
          >
            <span className={`routines-section__dot routines-section__dot--${pb.status}`} />
            <span className="routines-section__name">{pb.name}</span>
            <span className="routines-section__status">{pb.status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
