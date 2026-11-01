// npm run admin:create -- you@example.com owner      -> creates an admin with a random password (printed once)
// npm run seed                                       -> inserts clearly-flagged DEMO players/rounds/purchases
// npm run seed -- --purge                            -> removes all demo rows
require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');
const S = require('./sec');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const [cmd, ...args] = process.argv.slice(2);

async function createAdmin(email, role) {
  if (!/^[^@\s]+@[^@\s]+$/.test(email || '') || !['owner', 'developer'].includes(role)) throw new Error('usage: admin:create -- <email> <owner|developer>');
  const pw = crypto.randomBytes(15).toString('base64url');   // 20 chars
  await pool.query('INSERT INTO admins(email, pw_hash, role) VALUES($1,$2,$3) ON CONFLICT (email) DO UPDATE SET pw_hash = $2, role = $3, fails = 0, locked_until = NULL, disabled = false',
    [email.toLowerCase(), await S.hashPw(pw), role]);
  console.log(`\n${role} ${email.toLowerCase()}\none-time password: ${pw}\n(Sign in at /admin, then set up 2FA and change it.)\n`);
}

async function seed(purge) {
  await pool.query('DELETE FROM users WHERE is_demo');
  if (purge) return console.log('Demo data removed.');
  let s = 7; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;   // deterministic
  const pick = a => a[Math.floor(rnd() * a.length)], DAY = 864e5, now = Date.now();
  const avatars = ['ruby', 'ocean', 'toxic', 'royal', 'shadow', 'gold'], accs = ['shades', 'bow', 'cap', 'headphones', 'tophat', 'crown'];
  const price = { ruby: 6, ocean: 10, toxic: 14, royal: 20, shadow: 30, gold: 50, shades: 3, bow: 4, cap: 5, headphones: 7, tophat: 9, crown: 15 };
  const types = [['casual', .45, 0.4, 0], ['grinder', .25, 4, .15], ['whale', .08, 3, 1], ['lapsed', .22, 1.5, .1]];   // [name, share, rounds/day, spend propensity]
  const N = 140, U = [], Rd = [], Pu = [];
  for (let i = 0; i < N; i++) {
    let r = rnd(), t = types[0]; for (const x of types) { if ((r -= x[1]) < 0) { t = x; break; } }
    const joined = now - (3 + rnd() * 55) * DAY, quitAt = t[0] === 'lapsed' ? joined + rnd() * 12 * DAY : now + DAY;
    const skill = 8 + rnd() * 14, cheater = rnd() < .04;
    let coins = 0, dia = 0, owned = ['classic'], ownedAcc = [], best = 0, last = joined;
    for (let d = joined; d < Math.min(now, quitAt); d += DAY) {
      const decay = t[0] === 'casual' ? Math.exp(-(d - joined) / DAY / 20) : 1;
      for (let k = 0; k < Math.round(t[2] * decay * (.4 + rnd() * 1.2)); k++) {
        const at = d + rnd() * DAY; if (at > now) continue;
        let stars = Math.max(0, Math.round(skill + (rnd() - .5) * 8)), bombs = Math.round(rnd() * 3), dur = bombs >= 3 ? 12 + rnd() * 28 : 45, score = stars * 10 * (rnd() < .15 ? 1.5 : 1) | 0;
        if (cheater && rnd() < .5) { stars = 120 + (rnd() * 80 | 0); score = stars * 10 * 2; bombs = 0; dur = 20 + rnd() * 10; }
        const earned = score; coins += earned; best = Math.max(best, score); last = Math.max(last, at);
        Rd.push([i, at, dur, score, stars, bombs, rnd() < .3 ? 1 : 0, earned]);
        if (coins >= 50 && rnd() < t[3] * .5) { coins -= 50; dia++; Pu.push([i, at, 'exchange', 'diamond', 0, 50]); }
        const want = pick([...avatars, ...accs]);
        if (dia >= price[want] && rnd() < t[3] && !owned.includes(want) && !ownedAcc.includes(want)) { dia -= price[want]; (avatars.includes(want) ? owned : ownedAcc).push(want); Pu.push([i, at, avatars.includes(want) ? 'avatars' : 'accessories', want, price[want], 0]); }
      }
    }
    U.push([`demo_${i}`, `demo.player${i}@example.test`, joined, last, JSON.stringify({ coins, diamonds: dia, owned, ownedAcc, skin: owned[owned.length - 1], best, tutorialDone: true })]);
  }
  const col = (rows, i, f = x => x) => rows.map(x => f(x[i]));   // bulk insert via unnest: a handful of round trips instead of thousands
  const ts = x => new Date(x).toISOString();
  await pool.query('INSERT INTO users(id, email, created_at, last_seen, state, is_demo) SELECT *, true FROM unnest($1::text[],$2::text[],$3::timestamptz[],$4::timestamptz[],$5::jsonb[])',
    [col(U, 0), col(U, 1), col(U, 2, ts), col(U, 3, ts), col(U, 4)]);
  await pool.query('INSERT INTO rounds(user_id, at, duration, score, stars, bombs, powerups, coins) SELECT * FROM unnest($1::text[],$2::timestamptz[],$3::real[],$4::int[],$5::int[],$6::int[],$7::int[],$8::int[])',
    [col(Rd, 0, i => `demo_${i}`), col(Rd, 1, ts), col(Rd, 2), col(Rd, 3), col(Rd, 4), col(Rd, 5), col(Rd, 6), col(Rd, 7)]);
  await pool.query('INSERT INTO purchases(user_id, at, kind, item, diamonds, coins) SELECT * FROM unnest($1::text[],$2::timestamptz[],$3::text[],$4::text[],$5::int[],$6::int[])',
    [col(Pu, 0, i => `demo_${i}`), col(Pu, 1, ts), col(Pu, 2), col(Pu, 3), col(Pu, 4), col(Pu, 5)]);
  console.log(`Seeded ${U.length} DEMO players, ${Rd.length} rounds, ${Pu.length} purchases (is_demo=true; remove with: npm run seed -- --purge).`);
}

(async () => {
  await pool.query(require('./schema'));
  if (cmd === 'create') await createAdmin(args[0], args[1]);
  else if (cmd === 'seed') await seed(args.includes('--purge'));
  else console.log('commands: create <email> <owner|developer> | seed [--purge]');
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
