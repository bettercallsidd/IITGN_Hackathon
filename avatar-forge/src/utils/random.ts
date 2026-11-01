import { CATALOG, CATEGORIES, type AvatarParts, type Category } from '../data/parts';

export const RARITY_FACTOR = 1.5; // tune to change how rare Legendary is
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(cat: Category, rng: Rng = Math.random): number {
  const ws = CATALOG[cat].map(p => (cat === 'mood' ? 1 : 1 / (1 + p.w * RARITY_FACTOR)));
  let r = rng() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ws.length; i++) if ((r -= ws[i]) < 0) return i;
  return ws.length - 1;
}

export const randomParts = (rng: Rng = Math.random, locked: Category[] = [], base?: AvatarParts): AvatarParts =>
  Object.fromEntries(CATEGORIES.map(c => [c, locked.includes(c) && base ? base[c] : pickWeighted(c, rng)])) as AvatarParts;

/** Uniform shuffle frame (visual only). */
export const shuffleParts = (rng: Rng = Math.random): AvatarParts =>
  Object.fromEntries(CATEGORIES.map(c => [c, Math.floor(rng() * CATALOG[c].length)])) as AvatarParts;
