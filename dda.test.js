// Run: node dda.test.js. Simulated players drive the KBFC engine; asserts it converges, tracks the target, and stays smooth.
// Bots catch with their OWN logistic (different scale than the engine's) so the engine is not tested against itself.
const assert = require('assert');
const KBFC = require('./public/dda.js');

function randn() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random()); }

/** Play `rounds` rounds of 45 s. skill = bot's true skill (fn of round time allows improvement). Returns stats. */
function play(dda, skill, rounds = 4, sTrue = 0.3) {
  const out = { maxRate: 0, rounds: [] };
  const dt = 0.1;
  let t = 0;
  for (let r = 0; r < rounds; r++) {
    dda.newRound();
    let spawnT = 0, nEv = 0, nCatch = 0, tgtSum = 0, ticks = 0;
    const pending = [];                                  // outcomes arrive ~2 s after spawn, like real falling items
    for (let time = 0; time < 45; time += dt, t += dt) {
      const prog = time / 45, prev = dda.state().d;
      dda.tick(dt, prog, 3);
      out.maxRate = Math.max(out.maxRate, Math.abs(dda.state().d - prev) / dt);
      tgtSum += dda.state().target; ticks++;
      const p = dda.params();
      spawnT += dt;
      if (spawnT >= p.spawnInterval) {
        spawnT = 0;
        const b = Math.max(0, (p.d * 1.3 + 0.1) * Math.exp(0.4 * randn()));    // harder content -> harder items
        pending.push({ due: time + 2, b });
      }
      while (pending.length && pending[0].due <= time) {
        const { b } = pending.shift();
        const ok = Math.random() < 1 / (1 + Math.exp(-((typeof skill === 'function' ? skill(t) : skill) - b) / sTrue));
        dda.observe(ok ? 'catch' : 'miss', b);
        nEv++; nCatch += ok;
      }
    }
    out.rounds.push({ d: dda.state().d, mu: dda.state().mu, rate: nCatch / nEv, target: tgtSum / ticks });
  }
  return out;
}

const fresh = () => KBFC.create({ storage: null });
const avg = (f, n = 20) => Array.from({ length: n }, f).reduce((a, b) => a + b, 0) / n;

// 1. Strong player ends up much harder than a weak one
const strong = avg(() => play(fresh(), 1.4).rounds.at(-1).d);
const weak   = avg(() => play(fresh(), 0.2).rounds.at(-1).d);
console.log({ strong: +strong.toFixed(2), weak: +weak.toFixed(2) });
assert(strong > 0.65, 'strong player should reach high difficulty');
assert(weak < 0.3, 'weak player should get easy difficulty');
assert(strong - weak >= 0.4, 'difficulty must separate strong from weak');

// 2. Observed catch rate sits near the policy target (flow band) once settled
const err = avg(() => { const r = play(fresh(), 0.8).rounds.at(-1); return Math.abs(r.rate - r.target); });
console.log({ flowError: +err.toFixed(3) });
assert(err < 0.08, 'catch rate should track the target within 8 points');

// 3. Smoothness: difficulty never changes faster than the rate limit
const rate = Math.max(...Array.from({ length: 10 }, () => play(fresh(), 1.0, 2).maxRate));
console.log({ maxRatePerSec: +rate.toFixed(3) });
assert(rate <= KBFC.DEFAULTS.rate + 1e-9, 'rate limit violated');

// 4. Cold start: skill estimate converges quickly, from a deliberately wrong prior
const miss = avg(() => { const d = fresh(); const r = play(d, 1.1, 1).rounds[0]; return Math.abs(r.mu - 1.1); });
console.log({ skillErrorAfter1Round: +miss.toFixed(2) });
assert(miss < 0.25, 'skill estimate should converge within one round');

// 5. Tracks improvement: a player who gets better ends harder than where they started
const up = avg(() => { const p = play(fresh(), t => 0.3 + t / 180 * 1.0, 4); return p.rounds.at(-1).d - p.rounds[0].d; });
console.log({ improvementDelta: +up.toFixed(2) });
assert(up > 0.2, 'difficulty should rise as the player improves');

// 6. Frustration guard: on the last life difficulty never increases
const g = fresh(); for (let i = 0; i < 30; i++) g.observe('catch', 1.0);
const before = g.state().d; for (let i = 0; i < 100; i++) g.tick(0.1, 0.5, 1);
assert(g.state().d <= before + 1e-9, 'difficulty must not rise on the last life');

// 7. Item difficulty is physical: farther or tighter = harder, within reach = 0
const D = KBFC.difficulty;
assert.strictEqual(D({ x: 100, t: 2, refX: 100, refT: 0, speed: 420, reach: 70 }), 0);
assert(D({ x: 400, t: 1, refX: 50, refT: 0, speed: 420, reach: 70 }) > D({ x: 400, t: 3, refX: 50, refT: 0, speed: 420, reach: 70 }));
console.log('all KBFC checks passed');
