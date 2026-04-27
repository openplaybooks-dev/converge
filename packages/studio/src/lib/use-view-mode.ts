'use client';
import { useEffect, useState } from 'react';

export type ViewMode = 'table' | 'kanban' | 'tree' | 'gantt';

export function useViewMode(key: string, defaultMode: ViewMode, allowed: ViewMode[]) {
  const storageKey = `studio.view.${key}`;
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as ViewMode | null;
    if (saved && allowed.includes(saved)) setMode(saved);
  }, [storageKey]);
  useEffect(() => { localStorage.setItem(storageKey, mode); }, [storageKey, mode]);
  return [mode, setMode] as const;
}