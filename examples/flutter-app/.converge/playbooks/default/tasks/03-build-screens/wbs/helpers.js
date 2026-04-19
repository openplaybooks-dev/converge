export function toPascalCase(str) {
  return str.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function toSnakeCase(str) {
  return str.replace(/-/g, '_');
}

export function routeToScreenPath(route, screenId) {
  const snakeName = screenId.replace(/-/g, '_');
  return `lib/screens/${snakeName}/${snakeName}_screen.dart`;
}

export function routeToWidgetsDir(screenId) {
  const snakeName = screenId.replace(/-/g, '_');
  return `lib/screens/${snakeName}/widgets`;
}
