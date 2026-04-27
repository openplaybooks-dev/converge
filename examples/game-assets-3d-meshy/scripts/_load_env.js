/**
 * Tiny .env loader — zero dependencies.
 *
 * Loads `<project root>/.env` (the example's root, not cwd) into process.env.
 * Existing process.env values are NOT overwritten — shell-exported vars win,
 * which matches dotenv's standard behavior.
 *
 * Supports:
 *   - KEY=value
 *   - KEY="value with spaces"
 *   - KEY='value'
 *   - lines starting with # (comments)
 *   - blank lines
 *
 * Does NOT support: variable interpolation, multi-line values, export prefix
 * (we strip "export " for convenience).
 *
 * Usage: import './_load_env.js' at the top of any script that reads
 * process.env.GEMINI_API_KEY / MESHY_API_KEY.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '..', '.env');   // <example>/.env

if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf-8');
  let loaded = 0;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const noExport = trimmed.replace(/^export\s+/, '');
    const eq = noExport.indexOf('=');
    if (eq < 1) continue;
    const key = noExport.slice(0, eq).trim();
    let value = noExport.slice(eq + 1).trim();
    // Strip wrapping quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Don't clobber shell-exported values
    if (process.env[key] === undefined) {
      process.env[key] = value;
      loaded++;
    }
  }
  if (loaded > 0 && process.env.CONVERGE_ENV_DEBUG) {
    console.error(`[_load_env] loaded ${loaded} var(s) from ${envPath}`);
  }
}
