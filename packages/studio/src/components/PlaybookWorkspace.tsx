'use client';

import { useState } from 'react';
import { ArrowLeft, BookOpen, FileText, Files } from 'lucide-react';
import { navigate } from '../router';
import { PLAYBOOK_DATA } from '../playbook-data';
import { PlaybookTab, JournalTab, FilesTab } from './workspace';
import type { PlaybookData } from '../playbook-data';

type TabId = 'playbook' | 'journal' | 'files';

const TABS: { id: TabId; label: string; glyph: string }[] = [
  { id: 'playbook', label: 'Playbook', glyph: '▶' },
  { id: 'journal', label: 'Journal', glyph: '◈' },
  { id: 'files', label: 'Files', glyph: '◻' },
];

export function PlaybookWorkspace({ playbookName }: { playbookName: string }) {
  const [activeTab, setActiveTab] = useState<TabId>('playbook');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [warning, setWarning] = useState<{ title: string; body: string } | null>(null);

  // Use mock PLAYBOOK_DATA; in production this would fetch by playbookName
  const playbook: PlaybookData = {
    ...PLAYBOOK_DATA,
    name: playbookName,
  };

  const pending = playbook.groups.flatMap(g => g.tasks).filter(t => t.review?.state === 'pending');

  function handleToggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApprove(id: string) {
    console.log('Approved:', id);
    // In production: submitReviewDecision(id, 'approve', '')
  }

  function handleChanges(id: string, data: { note: string; tags: string[] }) {
    console.log('Changes requested:', id, data);
    // In production: submitReviewDecision(id, 'changes', data.note)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--cv-bg)',
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        height: 48,
        borderBottom: '1px solid var(--cv-border)',
        background: 'var(--cv-bg-elev)',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => navigate({ kind: 'home', view: 'home' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'none', border: 'none', color: 'var(--cv-text-muted)',
            cursor: 'pointer', fontFamily: 'var(--cv-sans)', fontSize: 12,
            padding: '4px 6px', borderRadius: 2,
          }}
        >
          <ArrowLeft size={13} /> Home
        </button>
        <span style={{ color: 'var(--cv-border-strong)', fontSize: 14 }}>/</span>
        <span style={{
          fontFamily: 'var(--cv-mono)', fontSize: 13, fontWeight: 500,
          color: 'var(--cv-text)',
        }}>{playbookName}</span>
        <span style={{ flex: 1 }} />
        <span style={{
          fontFamily: 'var(--cv-mono)', fontSize: 11, fontWeight: 500,
          color: 'var(--cv-text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          {playbook.counts.total} tasks
        </span>
      </header>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '0 16px',
        borderBottom: '1px solid var(--cv-border)',
        background: 'var(--cv-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
          {TABS.map(t => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '10px 14px 9px',
                  border: 'none',
                  background: 'transparent',
                  borderBottom: active ? '2px solid var(--cv-text)' : '2px solid transparent',
                  fontFamily: 'var(--cv-sans)',
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--cv-text)' : 'var(--cv-text-muted)',
                  cursor: 'pointer',
                  transition: 'color 120ms ease, border-color 120ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontFamily: 'var(--cv-mono)', fontSize: 11, color: 'var(--cv-text-dim)' }}>
                  {t.glyph}
                </span>
                {t.label}
                {t.id === 'playbook' && pending.length > 0 && (
                  <span style={{
                    fontFamily: 'var(--cv-mono)', fontSize: 10, fontWeight: 600,
                    background: 'var(--cv-status-delta)', color: '#FFF',
                    padding: '1px 6px', borderRadius: 2,
                  }}>{pending.length}</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="cv-btn cv-btn--ghost" style={{ padding: '5px 10px', fontSize: 12 }}>
            ↗ Share
          </button>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--cv-text)', color: 'var(--cv-bg)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--cv-sans)', fontWeight: 600, fontSize: 12,
          }}>M</div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'playbook' && (
          <PlaybookTab
            playbook={playbook}
            expanded={expanded}
            onToggle={handleToggle}
            onApprove={handleApprove}
            onChanges={handleChanges}
            warning={warning}
          />
        )}
        {activeTab === 'journal' && <JournalTab playbook={playbook} />}
        {activeTab === 'files' && <FilesTab playbook={playbook} />}
      </div>
    </div>
  );
}