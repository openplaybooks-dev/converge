import { ConvergeWatcher, resolveProjectRoot } from './converge-adapter/index';

let _watcher: ConvergeWatcher | undefined;

export function getWatcher(): ConvergeWatcher {
  if (!_watcher) {
    _watcher = new ConvergeWatcher(resolveProjectRoot());
    _watcher.start();
    _watcher.setMaxListeners(100);
    process.on('exit', () => _watcher?.stop());
  }
  return _watcher;
}