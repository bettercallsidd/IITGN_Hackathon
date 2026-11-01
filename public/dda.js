/*
 * KBFC: Kinematic-Bayesian Flow Controller, the adaptive difficulty engine for BombDodger.
 * Structure follows Mortazavi et al. 2024 (Multimed Tools Appl 83), Fig. 7:
 *   Player Model (Bayesian skill filter) + DDA Policy (flow-band target) -> DDA module (feed-forward + PID)
 *   -> Content Controller (params()). Gameplay data only; hidden from the player.
 *
 * 1. difficulty(): how hard ONE item is, in units of "fraction of the player's max speed needed" (kinematics).
 * 2. observe():   Bayesian logistic update of skill mu ~ N(mu, v) from each catch / miss / bomb hit.
 * 3. tick():      target catch-rate p* (policy) -> feed-forward d = (mu - s*logit(p*))/bMax, PID trims observed error,
 *                 deadband + rate limit keep changes smooth and unnoticeable.
 * 4. params():    maps d in [0,1] to spawn interval, fall speed, bomb and power-up odds.
 * ponytail: single skill axis, and item difficulty is measured against the previous pending item (chain model).
 *           Upgrade: separate skill for reach vs. multitasking if one axis proves too coarse.
 */
(function (root) {
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const sig   = x => 1 / (1 + Math.exp(-x));
  const logit = p => Math.log(p / (1 - p));

  const DEFAULTS = {
    s: 0.35,                    // logistic scale: how sharply catch odds fall once difficulty passes skill
    mu0: 0.6, var0: 0.16,       // skill prior (difficulty units); sd 0.4 = uncertain, so a new player is learned fast
    q: 0.0006,                  // skill drift variance per second (learning, fatigue)
    bMax: 1.5,                  // item difficulty that corresponds to d = 1
    pStart: 0.8, pEnd: 0.65,    // policy: target catch rate fades over the round (tension arc)
    mercy: 0.08,                // extra target catch rate on the last life (frustration guard)
    kp: 0.6, ki: 0.05, iMax: 0.3,   // PID on (observed - target); iMax caps the integral term (anti-windup)
    ewma: 0.12,                 // smoothing of the observed catch rate
    rate: 0.05, dead: 0.015,    // max change of d per second, and deadband
    easy: { spawn: 0.95, fall: 0.75, bomb: 0.5, power: 1.5 },   // content at d = 0
    hard: { spawn: 0.35, fall: 1.5,  bomb: 1.5, power: 0.7 },   // content at d = 1
    key: 'catchRushSkill',
    storage: undefined,         // undefined = window.localStorage when available; null = never persist
  };

  /** Difficulty of one item: travel needed (beyond the catch reach) / travel the player can manage in the time given. */
  function difficulty({ x, t, refX, refT, speed, reach }) {
    const gap = Math.max(t - refT, 0.05);
    return clamp(Math.max(0, Math.abs(x - refX) - reach) / (gap * speed), 0, 2.5);
  }

  function create(opts) {
    const c = Object.assign({}, DEFAULTS, opts);
    const store = c.storage === undefined ? (typeof localStorage !== 'undefined' ? localStorage : null) : c.storage;
    const m = { mu: c.mu0, v: c.var0, d: 0, pObs: c.pStart, I: 0, pT: c.pStart };

    try {   // restore skill from a previous session; inflate uncertainty because skill may have changed since
      const p = JSON.parse(store && store.getItem(c.key));
      if (p && isFinite(p.mu) && isFinite(p.v) && isFinite(p.d)) {
        m.mu = clamp(p.mu, -0.5, 2.5); m.v = clamp(p.v * 1.5, 0.01, c.var0); m.d = clamp(p.d, 0, 1);
      } else m.d = clamp((m.mu - c.s * logit(c.pStart)) / c.bMax, 0, 1);
    } catch (e) { m.d = clamp((m.mu - c.s * logit(c.pStart)) / c.bMax, 0, 1); }

    return {
      /** kind: 'catch' | 'miss' (good item, with its difficulty b) | 'bomb' (a bomb was hit) */
      observe(kind, b) {
        const y = kind === 'catch' ? 1 : 0;
        if (kind === 'bomb') b = m.d * c.bMax;
        if (!isFinite(b)) return;
        const p = sig((m.mu - b) / c.s);
        const prec = 1 / m.v + p * (1 - p) / (c.s * c.s);       // Laplace / Kalman step on the logistic likelihood
        m.mu = clamp(m.mu + ((y - p) / c.s) / prec, -0.5, 2.5);
        m.v = Math.max(1 / prec, 0.0025);
        if (kind !== 'bomb') m.pObs += c.ewma * (y - m.pObs);
      },

      /** dt seconds, progress 0..1 through the round, lives left */
      tick(dt, progress, lives) {
        m.v = Math.min(m.v + c.q * dt, c.var0);
        m.pT = lerp(c.pStart, c.pEnd, progress) + (lives <= 1 ? c.mercy : 0);
        const e = m.pObs - m.pT;                                  // > 0: player finds it too easy
        m.I = clamp(m.I + e * dt, -c.iMax / c.ki, c.iMax / c.ki);
        const ff = (m.mu - c.s * logit(m.pT)) / c.bMax;
        const delta = clamp(ff + c.kp * e + c.ki * m.I, 0, 1) - m.d;
        if (Math.abs(delta) < c.dead || (lives <= 1 && delta > 0)) return;   // deadband; never harder on the last life
        m.d = clamp(m.d + clamp(delta, -c.rate * dt, c.rate * dt), 0, 1);
      },

      newRound() { m.pObs = c.pStart; m.I = 0; },

      params() {
        const E = c.easy, H = c.hard, d = m.d;
        return { d, spawnInterval: lerp(E.spawn, H.spawn, d), fallMult: lerp(E.fall, H.fall, d),
                 bombMult: lerp(E.bomb, H.bomb, d), powerMult: lerp(E.power, H.power, d) };
      },

      state() { return { mu: m.mu, sd: Math.sqrt(m.v), d: m.d, target: m.pT, pObs: m.pObs }; },

      save() { try { store && store.setItem(c.key, JSON.stringify({ mu: m.mu, v: m.v, d: m.d })); } catch (e) {} },
    };
  }

  const KBFC = { create, difficulty, DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = KBFC; else root.KBFC = KBFC;
})(typeof window !== 'undefined' ? window : globalThis);
