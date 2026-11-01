import { useEffect, useState, type KeyboardEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOG, CATEGORIES, LABELS, SWATCH, type AvatarParts, type Category } from '../data/parts';
import { AvatarSvg } from '../avatar/AvatarSvg';
import { useLookAt } from '../avatar/useLookAt';
import { derive, embedded, useStore } from '../store/avatarStore';
import { encode } from '../utils/encode';

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href; a.download = name; a.click();
}

const staticSvg = (p: AvatarParts) => renderToStaticMarkup(<AvatarSvg parts={p} uid="x" />);

function exportSvg(p: AvatarParts, name: string) {
  const url = URL.createObjectURL(new Blob([staticSvg(p)], { type: 'image/svg+xml' }));
  download(url, `${name}.svg`);
  URL.revokeObjectURL(url);
}

function exportPng(p: AvatarParts, name: string) {
  const url = URL.createObjectURL(new Blob([staticSvg(p)], { type: 'image/svg+xml' }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 440;
    c.getContext('2d')!.drawImage(img, 0, 0, 400, 440);
    download(c.toDataURL('image/png'), `${name}.png`);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function Picker({ cat }: { cat: Category }) {
  const value = useStore(s => s.parts[cat]);
  const locked = useStore(s => s.locked.includes(cat));
  const { setPart, toggleLock } = useStore.getState();
  const items = CATALOG[cat];
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + items.length) % items.length;
    setPart(cat, n);
    (e.currentTarget.parentElement!.children[n] as HTMLElement).focus();
  };
  return (
    <div className="row">
      <div className="lbl">
        {LABELS[cat]}
        {cat !== 'mood' && (
          <button className={`lock ${locked ? 'on' : ''}`} aria-pressed={locked} title={`Keep ${LABELS[cat]} when rolling`} onClick={() => toggleLock(cat)}>
            {locked ? '🔒' : '🔓'}<span className="sr">Lock {LABELS[cat]}</span>
          </button>
        )}
      </div>
      <div className="chips" role="radiogroup" aria-label={LABELS[cat]}>
        {items.map((it, i) => (
          <button
            key={it.name} role="radio" aria-checked={value === i} tabIndex={value === i ? 0 : -1}
            title={it.name} aria-label={it.name}
            className={`chip ${SWATCH.includes(cat) ? 'sw' : ''} ${value === i ? 'sel' : ''}`}
            style={SWATCH.includes(cat) ? { background: cat === 'aura' ? `linear-gradient(${it.color},${it.c2})` : it.color } : undefined}
            onClick={() => setPart(cat, i)} onKeyDown={e => key(e, i)}
          >
            {SWATCH.includes(cat) ? (value === i ? '✓' : '') : it.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Home() {
  const setScreen = useStore(s => s.setScreen);
  const parts = useStore(s => s.parts);
  useLookAt();
  return (
    <main className="home">
      <div className="frame homeav"><AvatarSvg parts={parts} uid="home" animated /></div>
      <h1>Avatar Forge</h1>
      <p className="muted">Build a living avatar. Roll for rarity.</p>
      <button className="primary big" autoFocus onClick={() => setScreen('play')}>▶ Start</button>
    </main>
  );
}

function PauseMenu() {
  const { setPaused, setScreen } = useStore.getState();
  return (
    <div className="overlay">
      <div className="dialog" role="dialog" aria-modal="true" aria-label="Paused">
        <h2>Paused</h2>
        <button className="primary" autoFocus onClick={() => setPaused(false)}>Resume</button>
        <button onClick={() => (embedded ? parent.postMessage({ type: 'exit' }, location.origin) : setScreen('home'))}>Exit to Home</button>
      </div>
    </div>
  );
}

// Embedded in the game: send the current avatar (static SVG) to the parent so the menu can show it.
if (embedded) {
  const send = () => parent.postMessage({ type: 'avatar', svg: staticSvg(useStore.getState().parts) }, location.origin);
  useStore.subscribe((s, p) => { if (s.parts !== p.parts && !s.rolling) send(); });
  send();
}

export function App() {
  return useStore(s => s.screen) === 'home' ? <Home /> : <Play />;
}

function Play() {
  useLookAt();
  const paused = useStore(s => s.paused);
  const parts = useStore(s => s.parts);
  const { rolling, revealKey, collection, past, future } = useStore();
  const { roll, save, load, remove, undo, redo } = useStore.getState();
  const d = derive(parts);
  const setPaused = useStore.getState().setPaused;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') { const st = useStore.getState(); st.setPaused(!st.paused); return; }
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (key === 'y') { e.preventDefault(); redo(); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [undo, redo]);

  const share = async () => {
    const url = `${location.origin}${location.pathname}?a=${encode(parts)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { prompt('Copy this link', url); }
  };

  return (
    <main className={`app ${paused ? 'paused' : ''}`}>
      <header className="top"><span>Avatar Forge</span><button onClick={() => setPaused(true)} aria-label="Pause">⏸ Pause</button></header>
      <aside className="left">
        <div className="frame" style={{ borderColor: d.color, boxShadow: `0 0 24px ${d.color}88` }}>
          <AvatarSvg parts={parts} uid="main" animated />
        </div>
        <div key={`n${revealKey}`} className={`nameplate ${revealKey ? 'pop' : ''}`} style={{ background: d.color }}>{d.name}</div>
        <div key={`t${revealKey}`} className={`tag ${revealKey ? 'pop' : ''}`} style={{ color: d.color, borderColor: d.color }}>{d.tier} · {d.score}</div>
        <div className="sr" aria-live="polite">{revealKey ? `${d.name}, ${d.tier.toLowerCase()}` : ''}</div>
        <div className="btns">
          <button className="primary" onClick={roll} disabled={rolling}>{rolling ? 'Rolling...' : '🎲 Roll'}</button>
          <button onClick={save}>💾 Save</button>
        </div>
        <div className="btns small">
          <button onClick={undo} disabled={!past.length} aria-label="Undo">↶</button>
          <button onClick={redo} disabled={!future.length} aria-label="Redo">↷</button>
          <button onClick={() => exportSvg(parts, d.name)}>SVG</button>
          <button onClick={() => exportPng(parts, d.name)}>PNG</button>
          <button onClick={share}>{copied ? 'Copied!' : 'Share'}</button>
        </div>
      </aside>
      <section className="right">
        {CATEGORIES.map(c => <Picker key={c} cat={c} />)}
        <h2>Collection <small>{collection.length}/8</small></h2>
        {collection.length === 0 ? (
          <p className="muted">Nothing saved yet. Hit Save on an avatar you like.</p>
        ) : (
          <ul className="gallery">
            {collection.map((p, i) => {
              const t = derive(p);
              return (
                <li key={i}>
                  <button className="thumb" style={{ borderColor: t.color }} onClick={() => load(i)} aria-label={`Load ${t.name}, ${t.tier.toLowerCase()}`}>
                    <AvatarSvg parts={p} uid={`t${i}`} />
                  </button>
                  <button className="x" onClick={() => remove(i)} aria-label={`Delete ${t.name}`}>×</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {paused && <PauseMenu />}
    </main>
  );
}
