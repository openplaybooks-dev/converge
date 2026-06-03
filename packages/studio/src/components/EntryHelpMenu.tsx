import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useT } from "../i18n";

const REPO = "https://github.com/openplaybooks-dev/converge";
const ISSUES_URL = `${REPO}/issues/new`;
const RELEASES_URL = `${REPO}/releases`;

const ext = { target: "_blank", rel: "noreferrer noopener" } as const;

export function EntryHelpMenu() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="entry-help-menu" ref={wrapRef}>
      <button
        type="button"
        className="entry-nav-rail__btn entry-help-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Help"
        data-tooltip="Help"
      >
        <Icon name="help-circle" size={18} />
      </button>
      {open ? (
        <div className="entry-help-popover" role="menu" aria-label="Help menu">
          <a
            className="entry-help-popover__item"
            href={ISSUES_URL}
            {...ext}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="entry-help-popover__icon" aria-hidden>
              <Icon name="comment" size={14} />
            </span>
            <span>Get Help</span>
          </a>
          <a
            className="entry-help-popover__item"
            href={RELEASES_URL}
            {...ext}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="entry-help-popover__icon" aria-hidden>
              <Icon name="bell" size={14} />
            </span>
            <span>What's New</span>
          </a>
        </div>
      ) : null}
    </div>
  );
}
