'use client'

import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="settings-panel">
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={theme || 'system'}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div className="settings-panel">
          <label className="block text-sm font-medium mb-2">Language</label>
          <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="en">English</option>
          </select>
        </div>

        <div className="settings-panel">
          <label className="block text-sm font-medium mb-2">Data Directory</label>
          <input
            type="text"
            value={process.env.CONVERGE_PROJECT_ROOT || ''}
            readOnly
            className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50"
          />
          <p className="text-xs text-gray-500 mt-1">Read-only</p>
        </div>
      </div>
    </div>
  )
}