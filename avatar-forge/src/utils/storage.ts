import { isValidParts } from './encode';
import type { AvatarParts } from '../data/parts';

const KEY = 'forgeG';
const VERSION = 1;
export const MAX_SAVED = 8;

export function loadCollection(): AvatarParts[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw?.version !== VERSION || !Array.isArray(raw.items)) return [];
    return raw.items.filter(isValidParts).slice(0, MAX_SAVED);
  } catch { return []; }
}

export function saveCollection(items: AvatarParts[]) {
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, items })); } catch { /* storage unavailable */ }
}

const CUR = 'forgeCur';
export function loadCurrent(): AvatarParts | null {
  try { const p = JSON.parse(localStorage.getItem(CUR) ?? 'null'); return isValidParts(p) ? p : null; } catch { return null; }
}
export function saveCurrent(p: AvatarParts) { try { localStorage.setItem(CUR, JSON.stringify(p)); } catch { /* ignore */ } }
