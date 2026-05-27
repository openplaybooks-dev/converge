let _override = '';

export function getProjectDir(): string {
  return _override || process.env.CONVERGE_PROJECT_DIR || '';
}

export function setProjectDir(dir: string): void {
  _override = dir;
  process.env.CONVERGE_PROJECT_DIR = dir;
}
