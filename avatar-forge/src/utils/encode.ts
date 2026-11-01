import { CATALOG, CATEGORIES, type AvatarParts } from '../data/parts';

// Mixed-radix pack of the 7 indices -> base36.
export function encode(p: AvatarParts): string {
  let n = 0n;
  for (const c of CATEGORIES) n = n * BigInt(CATALOG[c].length) + BigInt(p[c]);
  return n.toString(36);
}

export function decode(code: string): AvatarParts | null {
  if (!/^[0-9a-z]{1,12}$/.test(code)) return null;
  let n = 0n;
  for (const ch of code) n = n * 36n + BigInt(parseInt(ch, 36));
  const out = {} as AvatarParts;
  for (const c of [...CATEGORIES].reverse()) {
    const len = BigInt(CATALOG[c].length);
    out[c] = Number(n % len);
    n /= len;
  }
  return n === 0n ? out : null; // leftover = code outside catalog range
}

export const isValidParts = (p: unknown): p is AvatarParts =>
  !!p && typeof p === 'object' &&
  CATEGORIES.every(c => Number.isInteger((p as AvatarParts)[c]) && (p as AvatarParts)[c] >= 0 && (p as AvatarParts)[c] < CATALOG[c].length);
