#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STITCH_SCREENS = JSON.parse(fs.readFileSync(path.join(ROOT, '.stitch/screens.json'), 'utf-8'));

const SCREENS_DIR = path.join(ROOT, 'lib/screens');
const WIDGETS_DIR = path.join(ROOT, 'lib/widgets');

const WIRED_HINTS = [
  'context.push', 'context.go', 'context.pop',
  'Navigator.of', 'ref.read', 'ref.watch', 'setState',
  'showDialog', 'showModalBottomSheet',
];

const HANDLER_PROPS = ['onPressed', 'onTap', 'onChanged', 'onSelected', 'onDestinationSelected'];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.name.endsWith('.dart')) out.push(p);
  }
  return out;
}

function relPath(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

// Parse one marker occurrence: produces {elementId, marker, file, type, widget, status, action, target}
function parseMarker(filePath, lines, idx) {
  const markerLine = lines[idx];
  const m = markerLine.match(/\/\/\s*@converge:element\s+(\S+)/);
  if (!m) return null;
  const slug = m[1];
  const marker = `// @converge:element ${slug}`;

  // Look 1-12 lines down for first handler property
  let handlerType = null;
  let handlerLineIdx = -1;
  for (let j = idx + 1; j < Math.min(lines.length, idx + 13); j++) {
    for (const hp of HANDLER_PROPS) {
      const re = new RegExp(`\\b${hp}\\s*:`);
      if (re.test(lines[j])) {
        handlerType = hp;
        handlerLineIdx = j;
        break;
      }
    }
    if (handlerType) break;
  }

  // Find widget name: scan upward from marker for nearest constructor-style identifier (Capitalized followed by '(')
  let widget = 'Unknown';
  for (let j = idx - 1; j >= Math.max(0, idx - 20); j--) {
    const wm = lines[j].match(/([A-Z][A-Za-z0-9_]+)\s*\(/);
    if (wm) { widget = wm[1]; break; }
  }
  // If handler is right above a widget constructor (common with bottom-nav pattern), look downward instead
  if (handlerLineIdx >= 0) {
    // Try to find widget name by looking up from marker for the most recent constructor
    // Already done above
  }

  // Capture handler body: from handlerLine to roughly +20 lines, joined
  let bodyText = '';
  if (handlerLineIdx >= 0) {
    bodyText = lines.slice(handlerLineIdx, Math.min(lines.length, handlerLineIdx + 25)).join('\n');
  }

  // Classify
  let status = 'empty';
  const wired = WIRED_HINTS.some(h => bodyText.includes(h));
  if (wired) status = 'wired';
  else if (/TODO/i.test(bodyText)) status = 'stub';
  else status = 'empty';

  // Action
  let action = '';
  let target = null;
  if (slug.startsWith('navigate:')) {
    const nav = slug.slice('navigate:'.length);
    // Map common slugs to routes
    const routeMap = {
      'home': '/home',
      'devices': '/devices',
      'safety': '/safe-zones',
      'settings': '/settings',
      'beacon-detail': '/devices',
      'beacon-settings': '/devices',
      'manage-followers': '/devices/co-guardians',
      'event-detail': '/history',
      'zone-detail': '/safe-zones',
      'system-permissions': '/settings',
      'notifications': '/settings',
      'back': null,
      'skip-onboarding': '/home',
      'onboarding-next': '/onboarding',
    };
    target = routeMap[nav] !== undefined ? routeMap[nav] : null;
    action = target ? `Navigate to ${target}` : `Navigate (${nav})`;
    if (status === 'wired') {
      const pushMatch = bodyText.match(/context\.(push|go|pop)\(([^)]*)\)/);
      if (pushMatch) action = `Calls context.${pushMatch[1]}(${pushMatch[2].trim()})`;
    }
  } else if (slug.startsWith('action:')) {
    const act = slug.slice('action:'.length);
    action = status === 'wired'
      ? `Performs ${act} via stateful handler`
      : `Should perform ${act}`;
  } else {
    action = status === 'wired' ? `Wired handler for ${slug}` : `Handler for ${slug} not yet implemented`;
  }

  return {
    elementId: slug,
    marker,
    file: relPath(filePath),
    type: handlerType || 'unknown',
    widget,
    status,
    action,
    target,
  };
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split(/\r?\n/);
  const elements = [];
  for (let i = 0; i < lines.length; i++) {
    if (/@converge:element\b/.test(lines[i])) {
      const el = parseMarker(filePath, lines, i);
      if (el) elements.push(el);
    }
  }
  return elements;
}

// Build screen list. Only include screens with markers.
const screensById = {};
for (const s of STITCH_SCREENS) {
  screensById[s.id] = s;
}

// Map screen dir name -> screen id
const dirToScreenIds = {
  'onboarding': ['onboarding'],
  'home_safe': ['home-safe'],
  'home_weak': ['home-weak'],
  'home_alert': ['home-alert'],
  'beacon_detail': ['beacon-detail'],
  'add_beacon': ['add-beacon'],
  'co_guardians_list': ['co-guardians-list'],
  'safe_zones': ['safe-zones'],
  'history': ['history'],
  'settings': ['settings'],
};

const screenDirs = fs.readdirSync(SCREENS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

const screens = [];
for (const dir of screenDirs) {
  const ids = dirToScreenIds[dir];
  if (!ids) continue;
  const screenId = ids[0];
  const stitch = screensById[screenId];
  if (!stitch) continue;

  const dirPath = path.join(SCREENS_DIR, dir);
  const dartFiles = walk(dirPath);
  const screenFile = dartFiles.find(f => f.endsWith(`${dir}_screen.dart`));
  const widgetFiles = dartFiles
    .filter(f => f.includes('/widgets/') || f.includes('/_widgets/'))
    .sort();

  const elements = [];
  for (const f of dartFiles) {
    elements.push(...scanFile(f));
  }

  if (elements.length === 0) {
    console.error(`ERROR: screen ${screenId} (${dir}) has no @converge:element markers`);
    process.exit(1);
  }

  screens.push({
    id: screenId,
    route: stitch.route,
    screenFile: screenFile ? relPath(screenFile) : null,
    widgetFiles: widgetFiles.map(relPath),
    elements,
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  bottomNavRoutes: ['/home', '/devices', '/safe-zones', '/settings'],
  screens,
};

fs.writeFileSync(path.join(ROOT, 'navigations.json'), JSON.stringify(manifest, null, 2));
const totalElements = screens.reduce((s, sc) => s + sc.elements.length, 0);
console.log(`Wrote navigations.json — ${screens.length} screens, ${totalElements} elements`);
