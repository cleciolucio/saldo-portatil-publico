import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
export function qaTool(name) {
  const path = resolve('.tools/bin', name + (process.platform === 'win32' ? '.exe' : ''));
  return existsSync(path) ? path : name;
}
