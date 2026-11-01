// Admin dashboard backend, mounted at /admin. Separate identity from players: own table, own cookie session.
// Security: scrypt passwords, TOTP 2FA (enforced by default), HttpOnly+SameSite=Strict cookie, hashed session tokens in DB,
// idle+absolute expiry, CSRF header + Origin check, per-IP and per-account throttling, RBAC (owner/developer),
// strict CSP, audit log, parameterised SQL only, emails masked for developers, only aggregates sent to the AI model.
const crypto = require('crypto');
const path = require('path');
const express = require('express');
const S = require('./sec');
const { analyze } = require('./ml');
const { generate } = require('./ai');

const IDLE = 30 * 60e3, ABSOLUTE = 8 * 3600e3, COIN_PER_DIAMOND = 50;
const REQUIRE_2FA = process.env.ADMIN_REQUIRE_2FA !== '0';
const ALLOW = (process.env.ADMIN_IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
const COOKIE = 'adm_sid';

module.exports = pool => {
  const r = express.Router();
  const q = (t, p) => pool.query(t, p).then(x => x.rows);
  const wrap = fn => (req, res, next) => fn(req, res, next).catch(e => { console.error('[admin]', e); res.status(500).json({ error: 'server error' }); });
  const audit = (req, action, target, detail) => q('INSERT INTO audit_log(admin_email, action, target, detail, ip) VALUES($1,$2,$3,$4,$5)',
    [req.admin?.email || detail?.email || null, action, target || null, detail || null, req.ip]).catch(() => {});

  // ── hardening for everything under /admin ──
  r.use((req, res, next) => {
    if (ALLOW.length && !ALLOW.includes(req.ip)) return res.status(404).end();
    res.set({
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Robots-Tag': 'noindex',
      ...(process.env.NODE_ENV === 'production' ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains' } : {}),
    });
    if (req.method !== 'GET' && req.method !== 'HEAD') {   // CSRF layer 1: same-origin only
      const o = req.get('origin');
      if (o && new URL(o).host !== req.get('host')) return res.status(403).json({ error: 'bad origin' });
    }
    next();
  });
  r.use(express.static(path.join(__dirname, 'web'), { index: 'index.html', maxAge: 0 }));

  // ── throttling (in-memory; ponytail: per-process, use Redis if you run several instances) ──
  const hits = new Map();
  const throttled = (key, max, win) => { const n = Date.now(), h = hits.get(key); if (!h || h.t < n) { hits.set(key, { n: 1, t: n + win }); return false; } return ++h.n > max; };
  setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.t < n) hits.delete(k); }, 60e3).unref();

  const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split(/=(.*)/s).slice(0, 2)));
  const setCookie = (req, res, val, maxAge) => res.append('Set-Cookie',
    `${COOKIE}=${val}; Path=/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${req.secure || process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);

  // ── auth middleware ──
  const authn = wrap(async (req, res, next) => {
    const tok = cookies(req)[COOKIE];
    if (!tok) return res.status(401).json({ error: 'auth' });
    const [s] = await q(`SELECT s.token_hash, s.csrf, s.created_at, s.last_used, a.id, a.email, a.role, a.totp_on, a.disabled
                         FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = $1`, [S.sha(tok)]);
    const n = Date.now();
    if (!s || s.disabled || n - new Date(s.last_used) > IDLE || n - new Date(s.created_at) > ABSOLUTE) {
      if (s) await q('DELETE FROM admin_sessions WHERE token_hash = $1', [s.token_hash]);
      setCookie(req, res, '', 0); return res.status(401).json({ error: 'auth' });
    }
    if (req.method !== 'GET' && !S.eq(req.get('x-csrf') || '', s.csrf)) return res.status(403).json({ error: 'csrf' });   // CSRF layer 2
    if (n - new Date(s.last_used) > 60e3) q('UPDATE admin_sessions SET last_used = now() WHERE token_hash = $1', [s.token_hash]);
    req.admin = { id: s.id, email: s.email, role: s.role, totp_on: s.totp_on, csrf: s.csrf, hash: s.token_hash };
    req.mustEnroll = REQUIRE_2FA && !s.totp_on;
    next();
  });
  const full = (req, res, next) => req.mustEnroll ? res.status(403).json({ error: 'enroll_2fa' }) : next();   // 2FA enrolment gate
  const owner = (req, res, next) => req.admin.role === 'owner' ? next() : res.status(403).json({ error: 'owner only' });
  const mask = (req, e) => !e ? '' : req.admin.role === 'owner' ? e : e.replace(/^(.).*(@.*)$/, '$1•••$2');
  const A = [authn, full];

  // ── login / session ──
  r.post('/api/login', wrap(async (req, res) => {
    const { email, password, code } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 200) return res.status(400).json({ error: 'bad request' });
    if (throttled('ip:' + req.ip, 10, 15 * 60e3)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const [a] = await q('SELECT * FROM admins WHERE lower(email) = lower($1)', [email]);
    const ok = await S.verifyPw(password, a ? a.pw_hash : S.DUMMY_HASH);   // always hash: no timing oracle for valid emails
    const locked = a && a.locked_until && new Date(a.locked_until) > new Date();
    const fail = async why => {
      if (a) await q(`UPDATE admins SET fails = fails + 1, locked_until = CASE WHEN fails + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END WHERE id = $1`, [a.id]);
      await audit(req, 'login_failed', email.slice(0, 80), { email: email.slice(0, 80), why });
      return res.status(401).json({ error: 'Invalid credentials' });   // same message for every failure
    };
    if (!a || a.disabled || !ok || locked) return fail(!a ? 'unknown' : a.disabled ? 'disabled' : locked ? 'locked' : 'password');
    if (a.totp_on) {
      if (!code) return res.json({ need_totp: true });
      if (!S.totpOk(S.unseal(a.totp_secret), code)) return fail('totp');
    }
    const tok = crypto.randomBytes(32).toString('base64url'), csrf = crypto.randomBytes(24).toString('base64url');
    await q('INSERT INTO admin_sessions(token_hash, admin_id, csrf, ip, ua) VALUES($1,$2,$3,$4,$5)', [S.sha(tok), a.id, csrf, req.ip, (req.get('user-agent') || '').slice(0, 200)]);
    await q('UPDATE admins SET fails = 0, locked_until = NULL, last_login = now() WHERE id = $1', [a.id]);
    await q(`DELETE FROM admin_sessions WHERE admin_id = $1 AND last_used < now() - interval '1 day'`, [a.id]);
    setCookie(req, res, tok, ABSOLUTE / 1000);
    req.admin = { email: a.email }; await audit(req, 'login', a.email);
    res.json({ ok: true });
  }));

  r.post('/api/logout', authn, wrap(async (req, res) => {
    await q('DELETE FROM admin_sessions WHERE token_hash = $1', [req.admin.hash]); setCookie(req, res, '', 0);
    await audit(req, 'logout'); res.json({ ok: true });
  }));

  r.get('/api/me', authn, (req, res) => res.json({ email: req.admin.email, role: req.admin.role, csrf: req.admin.csrf, totp_on: req.admin.totp_on, must_enroll_2fa: req.mustEnroll, ai: process.env.ANTHROPIC_API_KEY ? 'claude' : 'rules' }));

  // 2FA enrolment + password change (allowed before full access)
  r.post('/api/2fa/setup', authn, wrap(async (req, res) => {
    if (req.admin.totp_on) return res.status(400).json({ error: '2FA already on' });
    const secret = S.newSecret();
    await q('UPDATE admins SET totp_secret = $2 WHERE id = $1', [req.admin.id, S.seal(secret)]);
    res.json({ secret, uri: `otpauth://totp/CatchRush:${encodeURIComponent(req.admin.email)}?secret=${secret}&issuer=CatchRush` });
  }));
  r.post('/api/2fa/enable', authn, wrap(async (req, res) => {
    const [a] = await q('SELECT totp_secret FROM admins WHERE id = $1', [req.admin.id]);
    if (!a?.totp_secret || !S.totpOk(S.unseal(a.totp_secret), (req.body || {}).code)) return res.status(400).json({ error: 'Wrong code' });
    await q('UPDATE admins SET totp_on = true WHERE id = $1', [req.admin.id]); await audit(req, '2fa_enabled'); res.json({ ok: true });
  }));
  r.post('/api/password', authn, wrap(async (req, res) => {
    const { current, next } = req.body || {}, bad = S.pwProblem(next);
    if (bad) return res.status(400).json({ error: bad });
    const [a] = await q('SELECT pw_hash FROM admins WHERE id = $1', [req.admin.id]);
    if (typeof current !== 'string' || !(await S.verifyPw(current, a.pw_hash))) return res.status(400).json({ error: 'Current password is wrong' });
    await q('UPDATE admins SET pw_hash = $2 WHERE id = $1', [req.admin.id, await S.hashPw(next)]);
    await q('DELETE FROM admin_sessions WHERE admin_id = $1 AND token_hash <> $2', [req.admin.id, req.admin.hash]);   // sign out everywhere else
    await audit(req, 'password_changed'); res.json({ ok: true });
  }));

  // ── analysis cache (models retrain at most every 5 min or after a write) ──
  let cache = null;
  const analysis = async () => {
    if (cache && Date.now() - cache.t < 300e3) return cache.v;
    const [users, rounds, purchases] = await Promise.all([
      q('SELECT id, extract(epoch FROM created_at)*1000 AS created FROM users'),
      q(`SELECT user_id, extract(epoch FROM at)*1000 AS at, duration, score, stars, bombs FROM rounds WHERE at > now() - interval '90 days' ORDER BY at LIMIT 500000`),
      q(`SELECT user_id, extract(epoch FROM at)*1000 AS at, diamonds FROM purchases WHERE kind <> 'exchange'`),
    ]);
    const num = x => x.map(o => ({ ...o, at: +o.at, created: +o.created }));
    const day = {}; num(rounds).forEach(o => (day[Math.floor(o.at / 864e5)] ||= new Set()).add(o.user_id));
    const today = Math.floor(Date.now() / 864e5), dau = Array.from({ length: 30 }, (_, i) => (day[today - 29 + i]?.size || 0));
    const v = analyze({ users: num(users), rounds: num(rounds), purchases: num(purchases), dau });
    cache = { t: Date.now(), v }; return v;
  };
  const bust = () => { cache = null; };

  const overview = async () => {
    const [k] = await q(`SELECT
      (SELECT count(*) FROM users)::int players,
      (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days')::int new7,
      (SELECT count(DISTINCT user_id) FROM rounds WHERE at > now() - interval '1 day')::int dau,
      (SELECT count(DISTINCT user_id) FROM rounds WHERE at > now() - interval '7 days')::int wau,
      (SELECT count(DISTINCT user_id) FROM rounds WHERE at > now() - interval '30 days')::int mau,
      (SELECT count(*) FROM rounds)::int rounds, (SELECT coalesce(sum(duration),0) FROM rounds) secs,
      (SELECT coalesce(sum(stars),0) FROM rounds)::int stars, (SELECT coalesce(sum(bombs),0) FROM rounds)::int bombs,
      (SELECT coalesce(sum(coins),0) FROM rounds)::bigint coins_earned,
      (SELECT coalesce(sum(diamonds),0) FROM purchases WHERE kind <> 'exchange')::int diamonds_spent,
      (SELECT count(DISTINCT user_id) FROM purchases WHERE kind <> 'exchange')::int payers,
      (SELECT coalesce(sum(CASE WHEN state->>'coins' ~ '^[0-9]{1,12}$' THEN (state->>'coins')::bigint END),0) FROM users)::bigint coins_circulating,
      (SELECT count(*) FROM users WHERE banned)::int banned`);
    const [top_items, series] = await Promise.all([q(`SELECT item, count(*)::int n FROM purchases WHERE kind <> 'exchange' GROUP BY item ORDER BY n DESC LIMIT 5`),
      q(`WITH d AS (SELECT generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') AS d),
          r AS (SELECT date_trunc('day', at) d, count(DISTINCT user_id) dau, count(*) rounds, sum(stars) stars, round(sum(duration)/60) minutes FROM rounds WHERE at >= now() - interval '31 days' GROUP BY 1),
          u AS (SELECT date_trunc('day', created_at) d, count(*) signups FROM users WHERE created_at >= now() - interval '31 days' GROUP BY 1),
          p AS (SELECT date_trunc('day', at) d, sum(diamonds) diamonds FROM purchases WHERE kind <> 'exchange' AND at >= now() - interval '31 days' GROUP BY 1)
        SELECT to_char(d.d, 'YYYY-MM-DD') AS day, coalesce(r.dau,0)::int dau, coalesce(r.rounds,0)::int rounds, coalesce(r.stars,0)::int stars, coalesce(r.minutes,0)::int minutes,
               coalesce(u.signups,0)::int signups, coalesce(p.diamonds,0)::int diamonds
        FROM d LEFT JOIN r USING (d) LEFT JOIN u USING (d) LEFT JOIN p USING (d) ORDER BY 1`)]);
    return { ...k, secs: undefined, play_hours: +(k.secs / 3600).toFixed(1), avg_round_s: k.rounds ? +(k.secs / k.rounds).toFixed(1) : 0,
      rounds_per_player: k.players ? +(k.rounds / k.players).toFixed(1) : 0, invested_coins: k.diamonds_spent * COIN_PER_DIAMOND, top_items, series };
  };

  r.get('/api/overview', A, wrap(async (req, res) => {
    const [ov, ml] = await Promise.all([overview(), analysis()]);
    const risk = Object.values(ml.players).filter(p => p.churn > .7).length;
    res.json({ ...ov, forecast: ml.models.forecast.next7_dau, at_risk: risk, flagged_rounds: ml.flagged.length, segments: ml.models.segmentation.segments });
  }));

  // ── players ──
  const SORT = { joined: 'u.created_at', last_seen: 'u.last_seen', rounds: 'rounds', play: 'secs', stars: 'stars', best: 'best', spent: 'diamonds_spent', coins: 'coins' };
  const PLAYER_SQL = `SELECT u.id, u.email, u.created_at, u.last_seen, u.banned, u.is_demo,
      coalesce(r.n,0)::int rounds, coalesce(r.secs,0) secs, coalesce(r.stars,0)::int stars, coalesce(r.best,0)::int best, r.last_round,
      coalesce(p.dia,0)::int diamonds_spent,
      CASE WHEN u.state->>'coins' ~ '^[0-9]{1,12}$' THEN (u.state->>'coins')::bigint ELSE 0 END coins,
      CASE WHEN u.state->>'diamonds' ~ '^[0-9]{1,9}$' THEN (u.state->>'diamonds')::int ELSE 0 END diamonds
    FROM users u
    LEFT JOIN (SELECT user_id, count(*) n, sum(duration) secs, sum(stars) stars, max(score) best, max(at) last_round FROM rounds GROUP BY 1) r ON r.user_id = u.id
    LEFT JOIN (SELECT user_id, sum(diamonds) dia FROM purchases WHERE kind <> 'exchange' GROUP BY 1) p ON p.user_id = u.id`;
  const shape = (req, row, ml) => { const m = ml.players[row.id]; return { ...row, email: mask(req, row.email), play_min: +(row.secs / 60).toFixed(1), secs: undefined,
    invested_coins: row.diamonds_spent * COIN_PER_DIAMOND, churn: m ? +m.churn.toFixed(3) : null, segment: m?.seg || null, anomalies: m?.anom?.n || 0 }; };

  r.get('/api/players', A, wrap(async (req, res) => {
    const sort = SORT[req.query.sort] || 'u.created_at', dir = req.query.dir === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(0, parseInt(req.query.page, 10) || 0), qs = String(req.query.q || '').slice(0, 80).replace(/[\\%_]/g, '\\$&');
    const rows = await q(`SELECT * FROM (${PLAYER_SQL}) t WHERE ($1 = '' OR email ILIKE '%' || $1 || '%') ORDER BY ${sort.replace('u.', '')} ${dir} NULLS LAST LIMIT 25 OFFSET $2`, [qs, page * 25]);
    const [{ n }] = await q(`SELECT count(*)::int n FROM users WHERE ($1 = '' OR email ILIKE '%' || $1 || '%')`, [qs]);
    const ml = await analysis();
    res.json({ total: n, rows: rows.map(x => shape(req, x, ml)) });
  }));

  r.get('/api/players/:id', A, wrap(async (req, res) => {
    const id = String(req.params.id).slice(0, 100);
    const [u] = await q(`SELECT * FROM (${PLAYER_SQL}) t WHERE id = $1`, [id]);
    if (!u) return res.status(404).json({ error: 'not found' });
    const [rounds, purchases, [st]] = await Promise.all([
      q('SELECT at, duration, score, stars, bombs, powerups, coins, skin FROM rounds WHERE user_id = $1 ORDER BY at DESC LIMIT 50', [id]),
      q('SELECT at, kind, item, diamonds, coins FROM purchases WHERE user_id = $1 ORDER BY at DESC LIMIT 50', [id]),
      q(`SELECT state->'owned' owned, state->'ownedAcc' acc, state->>'skin' skin FROM users WHERE id = $1`, [id])]);
    const ml = await analysis(); res.json({ player: shape(req, u, ml), rounds, purchases, loadout: st });
  }));

  r.post('/api/players/:id/ban', A, wrap(async (req, res) => {
    const banned = !!(req.body || {}).banned, id = String(req.params.id).slice(0, 100);
    const n = (await pool.query('UPDATE users SET banned = $2 WHERE id = $1', [id, banned])).rowCount;
    bust(); await audit(req, banned ? 'ban' : 'unban', id); res.json({ ok: !!n });
  }));
  r.delete('/api/players/:id', A, owner, wrap(async (req, res) => {
    if ((req.body || {}).confirm !== 'delete') return res.status(400).json({ error: "type 'delete'" });
    const id = String(req.params.id).slice(0, 100), n = (await pool.query('DELETE FROM users WHERE id = $1', [id])).rowCount;
    bust(); await audit(req, 'delete_player', id); res.json({ ok: !!n });
  }));

  // ── economy ──
  r.get('/api/economy', A, wrap(async (req, res) => {
    const [items, kinds, [tot]] = await Promise.all([
      q(`SELECT kind, item, count(*)::int buyers, sum(diamonds)::int diamonds FROM purchases WHERE kind <> 'exchange' GROUP BY 1,2 ORDER BY diamonds DESC`),
      q(`SELECT kind, count(*)::int n, coalesce(sum(coins),0)::bigint coins, coalesce(sum(diamonds),0)::int diamonds FROM purchases GROUP BY 1`),
      q(`SELECT (SELECT coalesce(sum(coins),0) FROM rounds)::bigint earned,
                (SELECT coalesce(sum(CASE WHEN state->>'diamonds' ~ '^[0-9]{1,9}$' THEN (state->>'diamonds')::int END),0) FROM users)::bigint diamonds_held,
                (SELECT coalesce(sum(CASE WHEN state->>'coins' ~ '^[0-9]{1,12}$' THEN (state->>'coins')::bigint END),0) FROM users)::bigint coins_held`)]);
    res.json({ items, kinds, ...tot, coin_per_diamond: COIN_PER_DIAMOND });
  }));

  // ── AI ──
  r.get('/api/ai', A, wrap(async (req, res) => {
    const [row] = await q('SELECT at, source, report FROM ai_reports ORDER BY id DESC LIMIT 1');
    const ml = await analysis();
    const m = id => ({ ...ml.players[id], id });
    const risky = Object.keys(ml.players).map(m).sort((a, b) => b.churn - a.churn).slice(0, 15);
    const emails = Object.fromEntries((await q('SELECT id, email FROM users WHERE id = ANY($1)', [[...risky.map(x => x.id), ...ml.flagged.slice(0, 30).map(f => f.user_id)]])).map(x => [x.id, mask(req, x.email)]));
    res.json({ report: row?.report || null, models: ml.models,
      at_risk: risky.map(p => ({ id: p.id, email: emails[p.id], churn: +p.churn.toFixed(3), segment: p.seg || null, days_since_play: +p.f.recency.toFixed(1), rounds_7d: p.f.freq7 })),
      anomalies: ml.flagged.slice(0, 30).map(f => ({ ...f, email: emails[f.user_id], at: new Date(f.at).toISOString() })) });
  }));
  r.post('/api/ai/run', A, wrap(async (req, res) => {
    if (throttled('ai:' + req.admin.id, 3, 10 * 60e3)) return res.status(429).json({ error: 'AI runs are limited to 3 per 10 minutes.' });
    bust(); const [ov, ml] = await Promise.all([overview(), analysis()]);
    const report = await generate(ov, ml);
    await q('INSERT INTO ai_reports(source, report) VALUES($1,$2)', [report.source, report]);
    await audit(req, 'ai_run', report.source); res.json({ report });
  }));

  // ── admin management & audit (owner only) ──
  r.get('/api/audit', A, owner, wrap(async (req, res) => res.json({ rows: await q('SELECT at, admin_email, action, target, ip FROM audit_log ORDER BY id DESC LIMIT 200') })));
  r.get('/api/admins', A, owner, wrap(async (req, res) => res.json({ rows: await q('SELECT id, email, role, totp_on, disabled, last_login, locked_until FROM admins ORDER BY id') })));
  r.post('/api/admins', A, owner, wrap(async (req, res) => {
    const { email, role, password } = req.body || {}, bad = S.pwProblem(password);
    if (typeof email !== 'string' || !/^[^@\s]{1,64}@[^@\s]{1,190}$/.test(email) || !['owner', 'developer'].includes(role)) return res.status(400).json({ error: 'bad email or role' });
    if (bad) return res.status(400).json({ error: bad });
    try { await q('INSERT INTO admins(email, pw_hash, role) VALUES($1,$2,$3)', [email.toLowerCase(), await S.hashPw(password), role]); }
    catch (e) { return res.status(409).json({ error: 'email exists' }); }
    await audit(req, 'admin_created', email, { role }); res.json({ ok: true });
  }));
  r.post('/api/admins/:id', A, owner, wrap(async (req, res) => {
    const id = parseInt(req.params.id, 10), { disabled, reset_2fa } = req.body || {};
    if (id === req.admin.id) return res.status(400).json({ error: "can't change yourself" });
    if (typeof disabled === 'boolean') { await q('UPDATE admins SET disabled = $2 WHERE id = $1', [id, disabled]); if (disabled) await q('DELETE FROM admin_sessions WHERE admin_id = $1', [id]); }
    if (reset_2fa) { await q('UPDATE admins SET totp_on = false, totp_secret = NULL WHERE id = $1', [id]); await q('DELETE FROM admin_sessions WHERE admin_id = $1', [id]); }
    await audit(req, 'admin_updated', String(id), { disabled, reset_2fa }); res.json({ ok: true });
  }));

  // CSV export (owner). Cells starting with = + - @ are prefixed to block spreadsheet formula injection.
  r.get('/api/export/players.csv', A, owner, wrap(async (req, res) => {
    const ml = await analysis(), rows = await q(`${PLAYER_SQL} ORDER BY u.created_at`);
    const cols = ['id', 'email', 'created_at', 'last_seen', 'rounds', 'play_min', 'stars', 'best', 'coins', 'diamonds', 'diamonds_spent', 'invested_coins', 'churn', 'segment', 'anomalies', 'banned'];
    const cell = v => { v = v == null ? '' : v instanceof Date ? v.toISOString() : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    await audit(req, 'export_players', String(rows.length));
    res.type('text/csv').set('Content-Disposition', 'attachment; filename="players.csv"')
      .send([cols.join(','), ...rows.map(x => { const s = shape(req, x, ml); return cols.map(c => cell(s[c])).join(','); })].join('\n'));
  }));

  r.use((e, req, res, next) => res.status(e.status || 400).json({ error: 'bad request' }));   // JSON parse errors etc., no stack traces
  return r;
};
