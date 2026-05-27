import type { StudioConfig } from '../types';

const STORAGE_KEY = 'converge-studio-config';

export const DEFAULT_CONFIG: StudioConfig = {
  theme: 'system',
};

export function loadConfig(): StudioConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<StudioConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: StudioConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
