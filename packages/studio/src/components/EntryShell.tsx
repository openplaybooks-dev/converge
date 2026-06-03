import type { ReactNode } from "react";
import type { EntryHomeView } from "../types";
import { EntryNavRail } from "./EntryNavRail";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface Props {
  view: EntryHomeView;
  onViewChange: (view: EntryHomeView) => void;
  children: ReactNode;
  // When true, the main column does not own scroll — children fill the
  // remaining height and manage their own overflow. Used by routes like
  // the playbook workspace that have an internal split-pane layout.
  fillBody?: boolean;
  // Right-aligned slot inside the global topbar. Routes can use this for
  // page-scoped actions (refresh, share, avatar) without duplicating the
  // sidebar/topbar chrome.
  topbarActions?: ReactNode;
}

export function EntryShell({
  view,
  onViewChange,
  children,
  fillBody,
  topbarActions,
}: Props) {
  const mainClass = fillBody ? "entry-main--fill" : "entry-main--scroll";
  return (
    <div className="entry-shell entry-shell--no-header">
      <div className="entry">
        <EntryNavRail view={view} onViewChange={onViewChange} />
        <div className={mainClass}>
          <header className="entry-topbar">
            <WorkspaceSwitcher />
            {topbarActions && (
              <div className="entry-topbar__actions">{topbarActions}</div>
            )}
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
