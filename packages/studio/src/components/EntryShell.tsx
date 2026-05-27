import type { ReactNode } from 'react';
import type { EntryHomeView } from '../types';
import { EntryNavRail } from './EntryNavRail';

interface Props {
  view: EntryHomeView;
  onViewChange: (view: EntryHomeView) => void;
  children: ReactNode;
}

export function EntryShell({ view, onViewChange, children }: Props) {
  return (
    <div className="entry-shell entry-shell--no-header">
      <div className="entry">
        <EntryNavRail view={view} onViewChange={onViewChange} />
        <div className="entry-main--scroll">{children}</div>
      </div>
    </div>
  );
}
