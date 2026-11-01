import { describe, expect, it } from 'vitest';
import { CATALOG, CATEGORIES, DEFAULT_PARTS, generateName, score, tier, type AvatarParts } from '../data/parts';
import { decode, encode } from '../utils/encode';
import { mulberry32, randomParts } from '../utils/random';
import { loadCollection, saveCollection } from '../utils/storage';

const max = Object.fromEntries(CATEGORIES.map(c => [c, Math.max(...CATALOG[c].map((_, i) => i).filter(i => CATALOG[c][i].w === Math.max(...CATALOG[c].map(p => p.w))))])) as AvatarParts;

describe('rarity', () => {
  it('score bounds', () => { expect(score(DEFAULT_PARTS)).toBe(0); expect(score(max)).toBe(15); });
  it('tier boundaries', () => {
    const t = [3, 4, 6, 7, 9, 10, 12, 13].map(tier);
    expect(t).toEqual(['COMMON', 'UNCOMMON', 'UNCOMMON', 'RARE', 'RARE', 'EPIC', 'EPIC', 'LEGENDARY']);
  });
  it('legendary stays rare over 10k seeded rolls', () => {
    const rng = mulberry32(42);
    let n = 0;
    for (let i = 0; i < 10000; i++) if (tier(score(randomParts(rng))) === 'LEGENDARY') n++;
    expect(n / 10000).toBeLessThan(0.02);
  });
});

describe('names', () => {
  it('every outfit/accessory combo yields "{outfit word} {accessory word}"', () => {
    for (const [oi, o] of CATALOG.outfit.entries())
      for (const [ai, a] of CATALOG.accessory.entries())
        expect(generateName({ ...DEFAULT_PARTS, outfit: oi, accessory: ai })).toBe(`${o.word} ${a.word}`);
  });
  it('example', () => expect(generateName({ ...DEFAULT_PARTS, outfit: 2, accessory: 5 })).toBe('Mystic Angel'));
});

describe('share code', () => {
  it('round-trips', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) { const p = randomParts(rng); expect(decode(encode(p))).toEqual(p); }
  });
  it('rejects bad codes', () => {
    for (const c of ['', 'zzzzzzzzzzzz', 'ABC', '!!', 'a b']) expect(decode(c)).toBeNull();
  });
});

describe('storage', () => {
  it('does not throw when localStorage is unavailable', () => {
    expect(loadCollection()).toEqual([]);
    expect(() => saveCollection([DEFAULT_PARTS])).not.toThrow();
  });
});
