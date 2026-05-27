import { useState } from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import type { StudioConfig } from '../types';
import { ACCENT_SWATCHES } from '../state/appearance';

interface Props {
  config: StudioConfig;
  onConfigChange: (config: StudioConfig) => void;
  onClose: () => void;
}

export function SettingsDialog({ config, onConfigChange, onClose }: Props) {
  const [section, setSection] = useState<'appearance' | 'providers'>('appearance');

  function setTheme(theme: StudioConfig['theme']) {
    onConfigChange({ ...config, theme });
  }

  function setAccent(color: string) {
    onConfigChange({ ...config, accentColor: color });
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-dialog__header">
          <h2 className="settings-dialog__title">Settings</h2>
          <button type="button" className="settings-dialog__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-dialog__body">
          <nav className="settings-dialog__nav">
            <button
              type="button"
              className={`settings-dialog__tab${section === 'appearance' ? ' settings-dialog__tab--active' : ''}`}
              onClick={() => setSection('appearance')}
            >
              Appearance
            </button>
            <button
              type="button"
              className={`settings-dialog__tab${section === 'providers' ? ' settings-dialog__tab--active' : ''}`}
              onClick={() => setSection('providers')}
            >
              Providers
            </button>
          </nav>

          <div className="settings-dialog__content">
            {section === 'appearance' ? (
              <div className="settings-section">
                <h3 className="settings-section__title">Theme</h3>
                <div className="settings-theme-picker">
                  {([
                    { value: 'system' as const, icon: Monitor, label: 'System' },
                    { value: 'light' as const, icon: Sun, label: 'Light' },
                    { value: 'dark' as const, icon: Moon, label: 'Dark' },
                  ]).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`settings-theme-btn${config.theme === value ? ' settings-theme-btn--active' : ''}`}
                      onClick={() => setTheme(value)}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>

                <h3 className="settings-section__title">Accent Color</h3>
                <div className="settings-accent-picker">
                  {ACCENT_SWATCHES.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`settings-accent-swatch${config.accentColor === color ? ' settings-accent-swatch--active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setAccent(color)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="settings-section">
                <h3 className="settings-section__title">AI Providers</h3>
                <p className="settings-section__placeholder">
                  Provider configuration will be available when the studio server is connected.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
