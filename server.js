// BombDodger backend: serves /public, verifies Google sign-in, stores each player's progress in Postgres (Neon).
// Secrets live in .env only. ponytail: progress is client-authoritative (a player could edit their own coins);
// move purchases server-side if leaderboards or real money ever matter.
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');
const { OAuth2Client } = require('google-auth-library');

const { DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID = '', PORT = 3000 } = process.env;
if (!DATABASE_URL || !SESSION_SECRET) { console.error('Set DATABASE_URL and SESSION_SECRET in .env'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });
const google = new OAuth2Client(GOOGLE_CLIENT_ID);

// Signed 30-day session token: base64url(payload).hmac
const mac = s => crypto.createHmac('sha256', SESSION_SECRET).update(s).digest('base64url');
const sign = sub => { const p = Buffer.from(JSON.stringify({ sub, exp: Date.now() + 30 * 864e5 })).toString('base64url'); return p + '.' + mac(p); };
function verify(tok) {
  try {
    const [p, m] = (tok || '').split('.');
    const a = Buffer.from(m || ''), b = Buffer.from(mac(p || ''));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(p, 'base64url'));
    return d.exp > Date.now() ? d.sub : null;
  } catch (e) { return null; }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
const handle = fn => (req, res) => fn(req, res).catch(e => { console.error(e); res.status(500).json({ error: 'server' }); });
const auth = (req, res, next) => {
  const sub = verify((req.headers.authorization || '').replace('Bearer ', ''));
  if (!sub) return res.status(401).json({ error: 'unauthorised' });
  req.sub = sub; next();
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === '1');   // set behind a reverse proxy so req.ip / Secure cookies are right
app.use(express.json({ limit: '50kb' }));

app.get('/api/config', (req, res) => res.json({ googleClientId: GOOGLE_CLIENT_ID }));

app.post('/api/login', handle(async (req, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'GOOGLE_CLIENT_ID not set' });
  let p;
  try { p = (await google.verifyIdToken({ idToken: req.body.credential, audience: GOOGLE_CLIENT_ID })).getPayload(); }
  catch (e) { return res.status(401).json({ error: 'bad token' }); }
  const { rows } = await pool.query(
    `INSERT INTO users(id, email) VALUES($1, $2)
     ON CONFLICT (id) DO UPDATE SET email = $2, last_seen = now() RETURNING state, banned`, [p.sub, p.email]);
  if (rows[0].banned) return res.status(403).json({ error: 'banned' });
  res.json({ token: sign(p.sub), email: p.email, state: rows[0].state });
}));

app.get('/api/state', auth, handle(async (req, res) => {
  const { rows } = await pool.query('SELECT state FROM users WHERE id = $1', [req.sub]);
  res.json({ state: rows[0] ? rows[0].state : null });
}));

app.put('/api/state', auth, handle(async (req, res) => {
  const s = req.body.state;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return res.status(400).json({ error: 'bad state' });
  const r = await pool.query('UPDATE users SET state = $2, updated_at = now(), last_seen = now() WHERE id = $1 AND NOT banned', [req.sub, s]);
  res.status(r.rowCount ? 200 : 404).json({ ok: !!r.rowCount });
}));

// Telemetry for the admin dashboard. Client-reported, so values are clamped and the anomaly model flags cheaters.
app.post('/api/round', auth, handle(async (req, res) => {
  const b = req.body || {};
  const r = await pool.query(
    `INSERT INTO rounds(user_id, duration, score, stars, bombs, powerups, coins, skin)
     SELECT id, $2, $3, $4, $5, $6, $7, $8 FROM users WHERE id = $1 AND NOT banned`,
    [req.sub, clamp(b.duration, 0, 600), clamp(b.score, 0, 1e6) | 0, clamp(b.stars, 0, 5000) | 0, clamp(b.bombs, 0, 5000) | 0,
     clamp(b.powerups, 0, 5000) | 0, clamp(b.coins, 0, 1e7) | 0, String(b.skin || '').slice(0, 40)]);
  res.json({ ok: !!r.rowCount });
}));

app.post('/api/purchase', auth, handle(async (req, res) => {
  const b = req.body || {};
  if (!['avatars', 'accessories', 'exchange'].includes(b.kind)) return res.status(400).json({ error: 'bad kind' });
  await pool.query(
    `INSERT INTO purchases(user_id, kind, item, diamonds, coins) SELECT id, $2, $3, $4, $5 FROM users WHERE id = $1 AND NOT banned`,
    [req.sub, b.kind, String(b.item || '').slice(0, 40), clamp(b.diamonds, 0, 1e5) | 0, clamp(b.coins, 0, 1e7) | 0]);
  res.json({ ok: true });
}));

app.delete('/api/account', auth, handle(async (req, res) => {
  if (req.body.confirm !== 'delete') return res.status(400).json({ error: "type 'delete'" });
  await pool.query('DELETE FROM users WHERE id = $1', [req.sub]);
  res.json({ ok: true });
}));

app.use('/admin', require('./admin')(pool));   // developer/owner dashboard (own auth, see admin/README in .env.example)
app.use(express.static(require('path').join(__dirname, 'public')));

pool.query(require('./admin/schema'))
  .then(() => app.listen(PORT, () => console.log(`BombDodger on http://localhost:${PORT}`)))
  .catch(e => { console.error('Database connection failed:', e.message); process.exit(1); });
