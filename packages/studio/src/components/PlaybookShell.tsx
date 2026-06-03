import type { ReactNode } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface Props {
  children: ReactNode;
}

export function PlaybookShell({ children }: Props) {
  return (
    <div className="entry-shell entry-shell--no-header">
      <div className="entry">
        <div className="entry-main--scroll">
          <header className="entry-topbar">
            <WorkspaceSwitcher />
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
