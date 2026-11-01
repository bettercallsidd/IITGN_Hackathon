// Player-analytics models in plain JS (no deps). Trained on demand from the live DB, deterministic (seeded).
//   ML  : logistic regression  -> 7-day churn risk (trained on a temporal split: features @ T-7d, label = absent since)
//   ML  : k-means              -> behavioural segments
//   DL  : autoencoder (MLP)    -> per-round anomaly / cheat detection (reconstruction error)
//   Stat: Holt linear smoothing -> 7-day DAU forecast
//   Sim : whatIf()             -> re-scores churn after changing a feature (used to verify AI recommendations)
// ponytail: whole 90-day window is held in memory; fine to ~1M rounds, move aggregation into SQL beyond that.
const DAY = 864e5;
const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const sum = (a, f = x => x) => a.reduce((s, x, i) => s + f(x, i), 0);
const avg = a => a.length ? sum(a) / a.length : 0;
const sd = a => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) ** 2))) || 1; };
const sig = z => 1 / (1 + Math.exp(-z));

const FEATS = ['recency', 'freq7', 'active14', 'avg_score', 'score_trend', 'bomb_rate', 'avg_dur', 'spend'];
const LEVERS = ['recency', 'freq7', 'active14', 'avg_score', 'bomb_rate', 'avg_dur', 'spend'];   // things the game team can actually influence

function features(rs, spend, T) {   // rs: one player's rounds up to T, ascending
  if (!rs.length) return null;
  const sc = rs.map(r => r.score), k = Math.min(5, rs.length >> 1);
  const st = sum(rs, r => r.stars), bo = sum(rs, r => r.bombs);
  return {
    recency: Math.min(30, (T - rs[rs.length - 1].at) / DAY),
    freq7: rs.filter(r => r.at > T - 7 * DAY).length,
    active14: new Set(rs.filter(r => r.at > T - 14 * DAY).map(r => Math.floor(r.at / DAY))).size,
    avg_score: avg(sc),
    score_trend: k ? (avg(sc.slice(-k)) - avg(sc.slice(0, k))) / (avg(sc) + 1) : 0,
    bomb_rate: bo / (st + bo || 1),
    avg_dur: avg(rs.map(r => r.duration)),
    spend,
  };
}
const vec = f => [f.recency, Math.log1p(f.freq7), f.active14, Math.log1p(f.avg_score), Math.max(-2, Math.min(2, f.score_trend)), f.bomb_rate, f.avg_dur / 60, Math.log1p(f.spend)];

function fitLR(X, y, epochs = 600, lr = 0.2, l2 = 0.01) {
  const d = X[0].length; let w = Array(d).fill(0), b = 0;
  for (let e = 0; e < epochs; e++) {
    const gw = Array(d).fill(0); let gb = 0;
    X.forEach((x, i) => { const err = sig(b + sum(x, (v, j) => v * w[j])) - y[i]; gb += err; x.forEach((v, j) => gw[j] += err * v); });
    w = w.map((v, j) => v - lr * (gw[j] / X.length + l2 * v)); b -= lr * gb / X.length;
  }
  return { w, b };
}
function auc(p, y) {   // Mann-Whitney
  const idx = p.map((_, i) => i).sort((a, b) => p[a] - p[b]); let rank = 0, pos = 0, neg = 0;
  idx.forEach((i, r) => { if (y[i]) { rank += r + 1; pos++; } else neg++; });
  return pos && neg ? (rank - pos * (pos + 1) / 2) / (pos * neg) : null;
}

function kmeans(X, k, rand) {
  const C = [X[Math.floor(rand() * X.length)].slice()];
  while (C.length < k) {   // k-means++ seeding
    const d = X.map(x => Math.min(...C.map(c => sum(x, (v, j) => (v - c[j]) ** 2))));
    let r = rand() * sum(d), i = 0; while ((r -= d[i]) > 0 && i < X.length - 1) i++;
    C.push(X[i].slice());
  }
  let lab = [];
  for (let it = 0; it < 40; it++) {
    lab = X.map(x => { let b = 0, bd = 1e18; C.forEach((c, i) => { const d = sum(x, (v, j) => (v - c[j]) ** 2); if (d < bd) { bd = d; b = i; } }); return b; });
    C.forEach((c, i) => { const m = X.filter((_, j) => lab[j] === i); if (m.length) c.forEach((_, j) => c[j] = avg(m.map(x => x[j]))); });
  }
  return { C, lab };
}

// Tiny MLP trained by per-sample SGD. sizes e.g. [6,4,2,4,6]; tanh hidden, linear output.
function mlp(sizes, rand) {
  const L = sizes.slice(1).map((n, i) => ({ W: Array.from({ length: n }, () => Array.from({ length: sizes[i] }, () => (rand() - .5) * 1.2 / Math.sqrt(sizes[i]))), b: Array(n).fill(0) }));
  const fwd = x => { const A = [x]; L.forEach((l, i) => { const z = l.W.map((r, j) => l.b[j] + sum(r, (w, k) => w * A[i][k])); A.push(i < L.length - 1 ? z.map(Math.tanh) : z); }); return A; };
  const step = (x, t, lr) => {
    const A = fwd(x); let d = A[L.length].map((o, j) => o - t[j]);
    for (let i = L.length - 1; i >= 0; i--) {
      const l = L[i], prev = d.map(() => 0);
      l.W.forEach((r, j) => r.forEach((w, k) => { prev[k] += w * d[j]; r[k] -= lr * d[j] * A[i][k]; })); l.b.forEach((_, j) => l.b[j] -= lr * d[j]);
      d = prev.map((g, k) => i ? g * (1 - A[i][k] ** 2) : g);
    }
  };
  return { fwd: x => fwd(x)[L.length], step };
}
const rvec = r => [Math.log1p(r.score), Math.log1p(r.stars), Math.log1p(r.bombs), r.duration / 30, Math.log1p(r.score / Math.max(r.duration, 1)), r.stars ? r.score / (r.stars * 10) : 0];

function holt(y, h = 7, a = .5, b = .3) {
  if (y.length < 3) return { forecast: [], rmse: 0 };
  let lvl = y[0], tr = y[1] - y[0], se = 0;
  for (let i = 1; i < y.length; i++) { const p = lvl + tr; se += (y[i] - p) ** 2; const nl = a * y[i] + (1 - a) * p; tr = b * (nl - lvl) + (1 - b) * tr; lvl = nl; }
  return { forecast: Array.from({ length: h }, (_, i) => Math.max(0, lvl + tr * (i + 1))), rmse: Math.sqrt(se / (y.length - 1)) };
}

/** users:[{id,created}], rounds:[{user_id,at(ms),duration,score,stars,bombs}], purchases:[{user_id,at(ms),diamonds}], dau:number[] */
function analyze({ users, rounds, purchases, dau, now = Date.now() }) {
  const rand = rng(42);
  const R = new Map(), P = new Map();
  rounds.forEach(r => (R.get(r.user_id) || R.set(r.user_id, []).get(r.user_id)).push(r));
  purchases.forEach(p => (P.get(p.user_id) || P.set(p.user_id, []).get(p.user_id)).push(p));
  const spendAt = (id, T) => sum((P.get(id) || []).filter(p => p.at <= T), p => p.diamonds);
  const featAt = (id, T) => features((R.get(id) || []).filter(r => r.at <= T), spendAt(id, T), T);

  // --- churn (logistic regression) ---
  const cut = now - 7 * DAY, trX = [], trY = [];
  for (const [id, rs] of R) { const f = featAt(id, cut); if (f && rs[0].at <= cut) { trX.push(vec(f)); trY.push(rs.some(r => r.at > cut) ? 0 : 1); } }
  const mu = FEATS.map((_, j) => avg(trX.map(x => x[j]))), sg = FEATS.map((_, j) => sd(trX.map(x => x[j])));
  const z = v => v.map((x, j) => (x - mu[j]) / sg[j]);
  let lr = null, churnInfo = { type: 'heuristic', n: trX.length, auc: null };
  if (trX.length >= 30 && trY.some(v => v) && trY.some(v => !v)) {
    const Z = trX.map(z), te = Z.map((_, i) => i % 5 === 0);   // every 5th row held out for the honest AUC
    lr = fitLR(Z.filter((_, i) => !te[i]), trY.filter((_, i) => !te[i]));
    const zt = Z.filter((_, i) => te[i]);
    churnInfo = { type: 'logistic-regression', n: trX.length, base_rate: avg(trY),
      auc: auc(zt.map(x => sig(lr.b + sum(x, (v, j) => v * lr.w[j]))), trY.filter((_, i) => te[i])),
      weights: Object.fromEntries(FEATS.map((f, j) => [f, +lr.w[j].toFixed(3)])) };
  }
  const prob = f => lr ? sig(lr.b + sum(z(vec(f)), (v, j) => v * lr.w[j])) : sig(.35 * (f.recency - 4));

  const P_ = {};   // per-player model output
  const cur = [];
  for (const u of users) { const f = featAt(u.id, now); if (f) { P_[u.id] = { f, churn: prob(f) }; cur.push(u.id); } }

  // --- segments (k-means) ---
  const names = {};
  let segInfo = { k: 0, segments: [] };
  if (cur.length >= 8) {
    const raw = cur.map(id => { const f = P_[id].f; return [f.recency, Math.log1p(f.freq7), Math.log1p(f.avg_score), Math.log1p(f.spend), f.avg_dur / 60]; });
    const m = raw[0].map((_, j) => avg(raw.map(x => x[j]))), s = raw[0].map((_, j) => sd(raw.map(x => x[j])));
    const k = Math.min(4, cur.length >> 2), { lab } = kmeans(raw.map(x => x.map((v, j) => (v - m[j]) / s[j])), k, rand);
    const groups = Array.from({ length: k }, (_, i) => cur.filter((_, j) => lab[j] === i)).filter(g => g.length);
    const stat = g => ({ ids: g, recency: avg(g.map(i => P_[i].f.recency)), freq: avg(g.map(i => P_[i].f.freq7)), spend: avg(g.map(i => P_[i].f.spend)) });
    let left = groups.map(stat);
    const take = (name, key) => { if (!left.length) return; const t = left.reduce((a, b) => b[key] > a[key] ? b : a); left = left.filter(x => x !== t); names[name] = t; };
    take('Lapsed', 'recency'); take('Big spenders', 'spend'); take('Grinders', 'freq'); left.forEach((g, i) => names[i ? 'Casuals ' + (i + 1) : 'Casuals'] = g);
    segInfo = { k, segments: Object.entries(names).map(([name, g]) => {
      for (const id of g.ids) P_[id].seg = name;
      return { name, players: g.ids.length, avg_days_since_play: +g.recency.toFixed(1), rounds_7d: +g.freq.toFixed(1), avg_diamonds_spent: +g.spend.toFixed(1), avg_churn: +avg(g.ids.map(i => P_[i].churn)).toFixed(3) };
    }) };
  }

  // --- anomaly (autoencoder) ---
  const all = rounds.filter(r => r.duration > 0), aeInfo = { type: 'autoencoder 6-4-2-4-6', rounds: all.length, flagged: 0, threshold_rmse: 1 };
  const flagged = [];
  if (all.length >= 60) {
    const X = all.map(rvec), m = X[0].map((_, j) => avg(X.map(x => x[j]))), s = X[0].map((_, j) => sd(X.map(x => x[j])));
    const Z = X.map(x => x.map((v, j) => (v - m[j]) / s[j])), net = mlp([6, 4, 2, 4, 6], rand);
    let tr = Z.filter(x => x.every(v => Math.abs(v) < 2.5));   // train on the inlier band only, so cheaters can't teach the net that cheating is normal
    if (tr.length < 50) tr = Z;
    if (tr.length > 3000) tr = tr.filter(() => rand() < 3000 / tr.length);
    for (let e = 0; e < 60; e++) for (const x of tr) net.step(x, x, 0.01 / (1 + e / 20));
    const le = Z.map(x => Math.sqrt(avg(net.fwd(x).map((o, j) => (o - x[j]) ** 2))));   // RMS reconstruction error
    const med = [...le].sort((a, b) => a - b)[le.length >> 1], mad = [...le].map(v => Math.abs(v - med)).sort((a, b) => a - b)[le.length >> 1] * 1.4826 || 1;
    all.forEach((r, i) => { const e = le[i]; if (e > Math.max(1, med + 10 * mad)) flagged.push({ user_id: r.user_id, at: r.at, score: r.score, stars: r.stars, bombs: r.bombs, duration: +r.duration.toFixed(1), err: +e.toFixed(2) }); });
    flagged.sort((a, b) => b.err - a.err); aeInfo.flagged = flagged.length;
    for (const f of flagged) { const p = P_[f.user_id]; if (p) { p.anom = p.anom || { n: 0, max: 0 }; p.anom.n++; p.anom.max = Math.max(p.anom.max, f.err); } }
  }

  const fc = holt(dau);
  const bySeg = seg => cur.filter(id => seg === 'all' || P_[id].seg === seg);
  /** Mean churn for a segment before/after changing one feature by pct%. This is a model what-if, not a causal claim. */
  const whatIf = (seg, feat, pct) => {
    if (!LEVERS.includes(feat) || !(Math.abs(pct) <= 100)) return null;
    const ids = bySeg(seg); if (!ids.length) return null;
    const mean = avg(ids.map(id => P_[id].f[feat]));   // relative to max(own value, segment mean) so "+30% activity" also moves players who are at 0
    const mod = id => { const f = { ...P_[id].f }; f[feat] = Math.max(0, f[feat] + pct / 100 * Math.max(f[feat], mean)); if (feat === 'bomb_rate') f[feat] = Math.min(1, f[feat]); return f; };
    const before = avg(ids.map(id => P_[id].churn)), after = avg(ids.map(id => prob(mod(id))));
    return { players: ids.length, before: +before.toFixed(4), after: +after.toFixed(4), delta_pp: +((after - before) * 100).toFixed(2), reliable: churnInfo.type !== 'heuristic' };
  };

  return { players: P_, flagged, whatIf, segments: Object.keys(names),
    models: { churn: churnInfo, segmentation: { type: 'k-means++', ...segInfo }, anomaly: aeInfo, forecast: { type: 'Holt linear', next7_dau: fc.forecast.map(v => +v.toFixed(1)), rmse: +fc.rmse.toFixed(2) } } };
}

module.exports = { analyze, LEVERS, holt };
