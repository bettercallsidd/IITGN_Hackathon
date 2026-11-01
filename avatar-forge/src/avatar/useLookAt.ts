import { useEffect } from 'react';
import { useStore } from '../store/avatarStore';

/** Writes --lx/--ly (-1..1) on <html> from the pointer. No React state, so no re-renders. */
export function useLookAt() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    let raf = 0, e: PointerEvent;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const tick = () => {
      raf = 0;
      root.style.setProperty('--lx', String(clamp((e.clientX - innerWidth / 2) / (innerWidth / 2))));
      root.style.setProperty('--ly', String(clamp((e.clientY - innerHeight / 2) / (innerHeight / 2))));
    };
    const move = (ev: PointerEvent) => { if (useStore.getState().paused) return; e = ev; raf ||= requestAnimationFrame(tick); };
    addEventListener('pointermove', move);
    return () => { removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
}
