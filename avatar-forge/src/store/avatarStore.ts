import { create } from 'zustand';
import { DEFAULT_PARTS, generateName, score, tierInfo, type AvatarParts, type Category } from '../data/parts';
import { randomParts, shuffleParts } from '../utils/random';
import { loadCollection, loadCurrent, saveCollection, saveCurrent, MAX_SAVED } from '../utils/storage';
import { decode } from '../utils/encode';

/** True when running inside the game's iframe. */
export const embedded = window.parent !== window;
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fromUrl = () => {
  try { const a = new URLSearchParams(location.search).get('a'); return a ? decode(a) : null; } catch { return null; }
};

type State = {
  parts: AvatarParts;
  collection: AvatarParts[];
  rolling: boolean;
  revealKey: number; // bumps after a roll to replay the pop animation
  locked: Category[];
  past: AvatarParts[];
  future: AvatarParts[];
  screen: 'home' | 'play';
  paused: boolean;
  setScreen(s: 'home' | 'play'): void;
  setPaused(p: boolean): void;
  setPart(cat: Category, index: number): void;
  roll(): Promise<void>;
  save(): void;
  load(i: number): void;
  remove(i: number): void;
  toggleLock(cat: Category): void;
  undo(): void;
  redo(): void;
};

export const useStore = create<State>((set, get) => {
  const commit = (next: AvatarParts) =>
    set(s => ({ parts: next, past: [...s.past, s.parts].slice(-50), future: [] }));
  return {
    parts: fromUrl() ?? loadCurrent() ?? DEFAULT_PARTS,
    collection: loadCollection(),
    rolling: false,
    revealKey: 0,
    locked: [],
    past: [],
    future: [],
    screen: embedded || fromUrl() ? 'play' : 'home',
    paused: false,
    setScreen: screen => set({ screen, paused: false }),
    setPaused: paused => set({ paused }),
    setPart: (cat, index) => commit({ ...get().parts, [cat]: index }),
    async roll() {
      if (get().rolling) return;
      const { locked, parts: base } = get();
      set({ rolling: true });
      if (!reducedMotion()) {
        for (let i = 0; i < 10; i++) {
          const f = shuffleParts();
          set({ parts: { ...f, ...Object.fromEntries(locked.map(c => [c, base[c]])) } as AvatarParts });
          await new Promise(r => setTimeout(r, 80));
          while (get().paused) await new Promise(r => setTimeout(r, 100));
        }
      }
      set(s => ({
        parts: randomParts(Math.random, locked, base),
        past: [...s.past, base].slice(-50), future: [],
        rolling: false, revealKey: s.revealKey + 1,
      }));
    },
    save() {
      const collection = [get().parts, ...get().collection].slice(0, MAX_SAVED);
      saveCollection(collection);
      set({ collection });
    },
    load: i => get().collection[i] && commit(get().collection[i]),
    remove(i) {
      const collection = get().collection.filter((_, j) => j !== i);
      saveCollection(collection);
      set({ collection });
    },
    toggleLock: cat => set(s => ({ locked: s.locked.includes(cat) ? s.locked.filter(c => c !== cat) : [...s.locked, cat] })),
    undo() {
      const { past, parts, future } = get();
      if (past.length) set({ parts: past[past.length - 1], past: past.slice(0, -1), future: [parts, ...future] });
    },
    redo() {
      const { past, parts, future } = get();
      if (future.length) set({ parts: future[0], past: [...past, parts], future: future.slice(1) });
    },
  };
});

// Derived values: computed from parts, never stored.
export const derive = (parts: AvatarParts) => {
  const sc = score(parts);
  return { score: sc, ...tierInfo(sc), name: generateName(parts) };
};

useStore.subscribe((s, prev) => {
  if (s.parts !== prev.parts && !s.rolling) saveCurrent(s.parts);
});
