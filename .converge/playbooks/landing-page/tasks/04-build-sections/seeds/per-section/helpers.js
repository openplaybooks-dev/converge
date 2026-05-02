// Helpers for the 04-build-sections WBS.

export function toPascalCase(str) {
  return String(str)
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

export function toKebabCase(str) {
  return String(str)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function sectionComponentPath(componentName) {
  return `apps/landing/src/components/sections/${componentName}.astro`;
}

export function sectionContentDir(sectionId) {
  return `apps/landing/.content/sections/${sectionId}`;
}
