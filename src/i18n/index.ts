import { en } from './en';

export type I18nPath = string;

export function t(path: string, params?: Record<string, string | number>): string {
  const parts = path.split('.');
  let current: unknown = en;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path; // fallback to key
    }
  }

  if (typeof current !== 'string') {
    return path;
  }

  let result = current;
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
    }
  }

  return result;
}

export { en };
