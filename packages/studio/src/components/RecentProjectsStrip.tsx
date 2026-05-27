import type { PlaybookSummary } from '../types';
import { BookOpen, ArrowRight } from 'lucide-react';

interface Props {
  playbooks: PlaybookSummary[];
  onOpen: (name: string) => void;
  onViewAll: () => void;
  limit?: number;
}

export function RecentProjectsStrip({ playbooks, onOpen, onViewAll, limit = 5 }: Props) {
  const visible = playbooks.slice(0, limit);

  if (visible.length === 0) return null;

  return (
    <section className="recent-projects-strip">
      <header className="recent-projects-strip__head">
        <h3 className="recent-projects-strip__title">Recent Playbooks</h3>
        <button
          type="button"
          className="recent-projects-strip__view-all"
          onClick={onViewAll}
        >
          View all <ArrowRight size={12} />
        </button>
      </header>
      <div className="recent-projects-strip__cards">
        {visible.map((pb) => (
          <button
            key={pb.name}
            type="button"
            className="recent-projects-strip__card"
            onClick={() => onOpen(pb.name)}
          >
            <BookOpen size={14} />
            <span className="recent-projects-strip__card-name">{pb.name}</span>
            <span className={`recent-projects-strip__badge recent-projects-strip__badge--${pb.status}`}>
              {pb.status}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
