import type { ReactNode } from "react";
import type { EntryHomeView } from "../types";
import { EntryHelpMenu } from "./EntryHelpMenu";
import {
  Home,
  FolderOpen,
  FolderTree,
  Play,
  Wrench,
  Server,
} from "lucide-react";

interface Props {
  view: EntryHomeView;
  onViewChange: (view: EntryHomeView) => void;
}

interface NavButtonProps {
  active?: boolean;
  ariaLabel: string;
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
}

function NavButton({
  active,
  ariaLabel,
  tooltip,
  onClick,
  children,
}: NavButtonProps) {
  return (
    <button
      type="button"
      className={`entry-nav-rail__btn${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      data-tooltip={tooltip}
    >
      {children}
    </button>
  );
}

function ConvergeMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 170 170" aria-hidden="true">
      <polygon points="0,170 170,170 170,0" fill="#D1CDB8" />
      <polygon points="0,0 0,170 170,0" fill="#8B8772" opacity="0.7" />
      <line
        x1="0"
        y1="170"
        x2="170"
        y2="0"
        stroke="#BE5133"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EntryNavRail({ view, onViewChange }: Props) {
  return (
    <nav className="entry-nav-rail" aria-label="Primary">
      <div className="entry-nav-rail__group">
        <button
          type="button"
          className="entry-nav-rail__logo"
          onClick={() => onViewChange("home")}
          aria-label="Converge Studio"
          data-tooltip="Home"
        >
          <ConvergeMark />
        </button>
        <div
          className="entry-nav-rail__logo-divider"
          role="separator"
          aria-hidden="true"
        />
        <NavButton
          active={view === "home"}
          ariaLabel="Home"
          tooltip="Home"
          onClick={() => onViewChange("home")}
        >
          <Home size={18} strokeWidth={1.5} />
        </NavButton>
        <NavButton
          active={view === "workspaces"}
          ariaLabel="Workspaces"
          tooltip="Workspaces"
          onClick={() => onViewChange("workspaces")}
        >
          <FolderTree size={18} strokeWidth={1.5} />
        </NavButton>
        <NavButton
          active={view === "playbooks"}
          ariaLabel="Playbooks"
          tooltip="Playbooks"
          onClick={() => onViewChange("playbooks")}
        >
          <FolderOpen size={18} strokeWidth={1.5} />
        </NavButton>
        <NavButton
          active={view === "runs"}
          ariaLabel="Runs"
          tooltip="Runs"
          onClick={() => onViewChange("runs")}
        >
          <Play size={18} strokeWidth={1.5} />
        </NavButton>
        <NavButton
          active={view === "skills"}
          ariaLabel="Skills"
          tooltip="Skills"
          onClick={() => onViewChange("skills")}
        >
          <Wrench size={18} strokeWidth={1.5} />
        </NavButton>
        <NavButton
          active={view === "providers"}
          ariaLabel="Providers"
          tooltip="Providers"
          onClick={() => onViewChange("providers")}
        >
          <Server size={18} strokeWidth={1.5} />
        </NavButton>
      </div>
      <div className="entry-nav-rail__footer">
        <div className="entry-nav-rail__divider" role="separator" />
        <EntryHelpMenu />
      </div>
    </nav>
  );
}
