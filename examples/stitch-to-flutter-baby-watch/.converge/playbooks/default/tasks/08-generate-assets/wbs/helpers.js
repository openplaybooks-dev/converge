/**
 * Asset Generation Helpers
 *
 * Shared utilities for the asset generation WBS scripts.
 */

/**
 * Convert kebab-case or snake_case to PascalCase
 */
export function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Convert kebab-case or PascalCase to snake_case
 */
export function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_');
}

/**
 * Get current date in ISO format
 */
export function getCurrentDate() {
  return new Date().toISOString();
}

/**
 * Format week number with leading zero
 */
export function formatWeek(week) {
  return String(week).padStart(2, '0');
}

/**
 * Generate asset ID from components
 */
export function generateAssetId(type, name) {
  return `${type}-${toSnakeCase(name)}`;
}

/**
 * Get output path based on asset type
 */
export function getOutputPath(assetType, fileName) {
  const paths = {
    'baby-size': `assets/illustrations/baby-sizes/${fileName}`,
    'icon': `assets/icons/${fileName}`,
    'empty-state': `assets/illustrations/empty-states/${fileName}`,
    'exercise': `assets/illustrations/exercises/${fileName}`,
    'hero': `assets/images/heroes/${fileName}`,
  };
  return paths[assetType] || `assets/${fileName}`;
}

/**
 * Validate SVG content
 */
export function isValidSvg(content) {
  if (!content || typeof content !== 'string') return false;
  const hasSvgTag = content.includes('<svg') && content.includes('</svg>');
  const hasXmlns = content.includes('xmlns=') || content.includes('xmlns:');
  return hasSvgTag && hasXmlns;
}

/**
 * Get default viewBox for asset type
 */
export function getDefaultViewBox(assetType) {
  const viewBoxes = {
    'baby-size': '0 0 200 200',
    'icon': '0 0 24 24',
    'empty-state': '0 0 200 200',
    'exercise': '0 0 200 200',
    'hero': '0 0 400 200',
  };
  return viewBoxes[assetType] || '0 0 100 100';
}

/**
 * Get default dimensions for asset type
 */
export function getDefaultDimensions(assetType) {
  const dimensions = {
    'baby-size': { width: 200, height: 200 },
    'icon': { width: 24, height: 24 },
    'empty-state': { width: 200, height: 200 },
    'exercise': { width: 200, height: 200 },
    'hero': { width: 400, height: 200 },
  };
  return dimensions[assetType] || { width: 100, height: 100 };
}
