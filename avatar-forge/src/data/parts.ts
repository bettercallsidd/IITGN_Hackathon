export type Category = 'skin' | 'hairStyle' | 'hairColor' | 'outfit' | 'accessory' | 'aura' | 'mood';
export type AvatarParts = Record<Category, number>;
export type Tier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type Part = { name: string; w: number; color?: string; eye?: string; word?: string; c2?: string };

export const CATEGORIES: Category[] = ['skin', 'hairStyle', 'hairColor', 'outfit', 'accessory', 'aura', 'mood'];
export const LABELS: Record<Category, string> = {
  skin: 'Skin', hairStyle: 'Hair style', hairColor: 'Hair color', outfit: 'Outfit',
  accessory: 'Accessory', aura: 'Aura', mood: 'Mood',
};
export const SWATCH: Category[] = ['skin', 'hairColor', 'aura'];

export const CATALOG: Record<Category, Part[]> = {
  skin: [
    { name: 'Peach', color: '#f0c4a0', w: 0, eye: '#4a2e1c' },
    { name: 'Tan', color: '#d29c72', w: 0, eye: '#3a2412' },
    { name: 'Deep', color: '#8d5a3b', w: 0, eye: '#24140a' },
    { name: 'Pale', color: '#f7dcc8', w: 0, eye: '#3d5a8a' },
    { name: 'Alien', color: '#8fe0a0', w: 2, eye: '#1b1b3a' },
    { name: 'Spectral', color: '#a9c4e8', w: 2, eye: '#ff3b6b' },
  ],
  hairStyle: ['Short', 'Bob', 'Long', 'Spiky', 'Mohawk', 'Bald'].map((name, i) => ({ name, w: i === 3 || i === 4 ? 1 : 0 })),
  hairColor: [
    { name: 'Brown', color: '#4a2c1a', w: 0 }, { name: 'Black', color: '#17120f', w: 0 },
    { name: 'Blonde', color: '#e2b84a', w: 0 }, { name: 'Silver', color: '#d9dfec', w: 1 },
    { name: 'Pink', color: '#ff4fa3', w: 2 }, { name: 'Flame', color: '#ff6a1a', w: 3 },
  ],
  outfit: [
    { name: 'Hoodie', w: 0, word: 'Street', color: '#5b6b8c' }, { name: 'Jacket', w: 1, word: 'Neon', color: '#1fa8a0' },
    { name: 'Robe', w: 2, word: 'Mystic', color: '#7a4fc4' }, { name: 'Armor', w: 3, word: 'Phoenix', color: '#9aa3b8' },
  ],
  accessory: [
    { name: 'None', w: 0, word: 'Wanderer' }, { name: 'Glasses', w: 1, word: 'Scholar' },
    { name: 'Headphones', w: 1, word: 'Runner' }, { name: 'Eyepatch', w: 1, word: 'Rogue' },
    { name: 'Horns', w: 2, word: 'Tamer' }, { name: 'Halo', w: 3, word: 'Angel' }, { name: 'Crown', w: 3, word: 'Monarch' },
  ],
  aura: [
    { name: 'Dusk', w: 0, color: '#6a5acd', c2: '#f4a6c0' }, { name: 'Ocean', w: 0, color: '#1e6fa8', c2: '#7fe0e0' },
    { name: 'Forest', w: 0, color: '#2e7d4f', c2: '#b7e07a' }, { name: 'Nebula', w: 2, color: '#2a1458', c2: '#c04fd8' },
    { name: 'Inferno', w: 3, color: '#7a0f0f', c2: '#ffb020' },
  ],
  mood: ['Happy', 'Cool', 'Wow', 'Sleepy'].map(name => ({ name, w: 0 })),
};

export const TIERS: { tier: Tier; min: number; color: string }[] = [
  { tier: 'COMMON', min: 0, color: '#9aa3b8' }, { tier: 'UNCOMMON', min: 4, color: '#4ade5a' },
  { tier: 'RARE', min: 7, color: '#3fb6ff' }, { tier: 'EPIC', min: 10, color: '#b565ff' },
  { tier: 'LEGENDARY', min: 13, color: '#ffc933' },
];

export const part = (cat: Category, p: AvatarParts) => CATALOG[cat][p[cat]];

export const score = (p: AvatarParts) =>
  CATEGORIES.filter(c => c !== 'mood').reduce((s, c) => s + part(c, p).w, 0);

export const tierInfo = (s: number) => [...TIERS].reverse().find(t => s >= t.min)!;
export const tier = (s: number): Tier => tierInfo(s).tier;

export const generateName = (p: AvatarParts) => `${part('outfit', p).word} ${part('accessory', p).word}`;

export const DEFAULT_PARTS: AvatarParts = { skin: 0, hairStyle: 0, hairColor: 0, outfit: 0, accessory: 0, aura: 0, mood: 0 };
