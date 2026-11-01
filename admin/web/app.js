// BombDodger control room. No inline JS/CSS (strict CSP) and no innerHTML: every value goes through textContent.
(() => {
  const $app = document.getElementById('app');
  let me = null, view = 'overview';
  const NS = 'http://www.w3.org/2000/svg';

  // ── tiny DOM helpers ──
  const h = (tag, a = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const k in a) { if (k === 'on') for (const ev in a.on) e.addEventListener(ev, a.on[ev]); else if (k === 'class') e.className = a[k]; else if (a[k] !== false && a[k] != null) e.setAttribute(k, a[k]); }
    kids.flat().forEach(c => c != null && c !== false && e.append(c.nodeType ? c : String(c)));
    return e;
  };
  const sv = (tag, a = {}, ...kids) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); kids.forEach(c => e.append(c)); return e; };
  const num = (n, d = 0) => n == null ? '–' : Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
  const ago = t => { if (!t) return 'never'; const m = (Date.now() - new Date(t)) / 6e4; return m < 60 ? Math.round(m) + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  const dur = m => m >= 60 ? (m / 60).toFixed(1) + ' h' : m.toFixed(0) + ' min';
  const pct = v => v == null ? '–' : (100 * v).toFixed(0) + '%';

  async function api(path, method = 'GET', body) {
    const r = await fetch('/admin/api' + path, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF': me?.csrf || '' }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 401 && path !== '/login') { me = null; renderLogin(); throw new Error('auth'); }
    const j = await r.json().catch(() => ({}));
    if (r.status === 403 && j.error === 'enroll_2fa') { renderEnroll(); throw new Error('enroll'); }
    if (!r.ok) throw new Error(j.error || 'Request failed');
    return j;
  }
  const guard = fn => (...a) => fn(...a).catch(e => { if (!['auth', 'enroll'].includes(e.message)) toast(e.message); });
  const toast = msg => { const t = h('div', { class: 'card', role: 'alert' }, msg); Object.assign(t.style, { position: 'fixed', right: '16px', bottom: '16px', zIndex: 20 }); document.body.append(t); setTimeout(() => t.remove(), 3500); };

  // ── charts (inline SVG) ──
  function chart(labels, series, fc = []) {
    const W = 600, H = 180, P = { l: 56, r: 10, t: 10, b: 26 }, n = labels.length + fc.length;
    const max = Math.max(1, ...series.flatMap(s => s.data), ...fc) * 1.1, X = i => P.l + i * (W - P.l - P.r) / Math.max(1, n - 1), Y = v => H - P.b - v / max * (H - P.t - P.b);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img' });
    [0, .5, 1].forEach(f => { svg.append(sv('line', { class: 'axis', x1: P.l, x2: W - P.r, y1: Y(max * f / 1.1), y2: Y(max * f / 1.1) }), sv('text', { x: 4, y: Y(max * f / 1.1) + 3 }, num(max * f / 1.1))); });
    [0, Math.floor((n - 1) / 2), n - 1].forEach(i => { const l = labels[i] || `+${i - labels.length + 1}d`; svg.append(sv('text', { x: X(i), y: H - 6, 'text-anchor': i ? (i === n - 1 ? 'end' : 'middle') : 'start' }, String(l).slice(5))); });
    series.forEach((s, k) => {
      svg.append(sv('polyline', { fill: 'none', stroke: s.color, 'stroke-width': 2, points: s.data.map((v, i) => `${X(i)},${Y(v)}`).join(' ') }));
      s.data.forEach((v, i) => svg.append(sv('circle', { cx: X(i), cy: Y(v), r: 6, fill: 'transparent' }, sv('title', {}, `${labels[i]}: ${s.name} ${num(v)}`))));
      if (k === 0 && fc.length) {
        const pts = [[labels.length - 1, s.data.at(-1)], ...fc.map((v, i) => [labels.length + i, v])];
        svg.append(sv('polyline', { fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-dasharray': '5 4', points: pts.map(([i, v]) => `${X(i)},${Y(v)}`).join(' ') }));
        fc.forEach((v, i) => svg.append(sv('circle', { cx: X(labels.length + i), cy: Y(v), r: 6, fill: 'transparent' }, sv('title', {}, `forecast +${i + 1}d: ${num(v, 1)}`))));
      }
    });
    return h('div', {}, svg, h('div', { class: 'legend' }, series.map(s => h('span', {}, h('i', { class: 'sw', 'data-c': s.color }), s.name)), fc.length ? h('span', {}, '- - forecast (Holt)') : null));
  }
  const card = (title, body, extra) => h('div', { class: 'card' }, h('div', { class: 'row' }, h('h3', {}, title), extra), body);
  const kpi = (label, value, sub, warn) => h('div', { class: 'card kpi' + (warn ? ' warn' : '') }, h('h3', {}, label), h('div', { class: 'v' }, value), h('div', { class: 's' }, sub || ' '));
  function paintLegend(root) { root.querySelectorAll('i.sw').forEach(i => i.style.background = i.dataset.c); }

  // ── login / enrol ──
  function renderLogin() {
    const err = h('div', { class: 'err', role: 'alert' }), email = h('input', { type: 'email', autocomplete: 'username', required: true }), pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    const code = h('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, pattern: '[0-9]{6}' }), codeRow = h('div', {}, h('label', {}, '2-factor code'), code);
    codeRow.hidden = true;
    const form = h('form', { on: { submit: async e => {
      e.preventDefault(); err.textContent = '';
      try {
        const r = await api('/login', 'POST', { email: email.value, password: pw.value, code: code.value || undefined });
        if (r.need_totp) { codeRow.hidden = false; code.focus(); return; }
        pw.value = ''; boot();
      } catch (x) { err.textContent = x.message; }
    } } }, h('label', {}, 'Email'), email, h('label', {}, 'Password'), pw, codeRow, err, h('button', { class: 'primary', style: false }, 'Sign in'));
    form.querySelector('button').style.width = '100%';
    $app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'card' }, h('h1', {}, 'BombDodger ', h('span', { class: 'muted' }, 'Control')), h('p', { class: 'muted' }, 'Authorised staff only. Activity is logged.'), form)));
    email.focus();
  }

  function renderEnroll() {
    const box = h('div', {}), err = h('div', { class: 'err' });
    $app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'card' }, h('h1', {}, 'Set up 2-factor'), h('p', { class: 'muted' }, 'Two-factor authentication is required. Add this key to an authenticator app (Google Authenticator, 1Password, Authy…), then enter the 6-digit code.'), box, err)));
    api('/2fa/setup', 'POST').then(r => {
      const code = h('input', { inputmode: 'numeric', maxlength: 6, autocomplete: 'one-time-code' });
      box.append(h('label', {}, 'Secret key'), h('code', {}, r.secret), h('p', { class: 'muted' }, 'Or open this link on your phone: ', h('a', { href: r.uri }, 'otpauth link')), h('label', {}, 'Code'), code,
        h('p', {}, h('button', { class: 'primary', on: { click: async () => { try { await api('/2fa/enable', 'POST', { code: code.value }); boot(); } catch (x) { err.textContent = x.message; } } } }, 'Enable')));
    }).catch(x => err.textContent = x.message);
  }

  // ── shell ──
  const NAV = [['overview', 'Overview'], ['players', 'Players'], ['economy', 'Economy'], ['ai', 'AI Insights'], ['security', 'Security']];
  function shell() {
    const main = h('main'), nav = h('nav', {}, h('div', { class: 'logo' }, 'BombDodger ', h('span', {}, 'Control')),
      NAV.map(([k, l]) => h('a', { href: '#' + k, class: view === k ? 'on' : '', on: { click: e => { e.preventDefault(); view = k; shell(); } } }, l)),
      h('div', { class: 'who' }, me.email, h('br'), me.role, ' · AI: ', me.ai, h('br'), h('button', { on: { click: async () => { await api('/logout', 'POST').catch(() => {}); me = null; renderLogin(); } } }, 'Sign out')));
    $app.replaceChildren(h('div', { class: 'shell' }, nav, main));
    guard(VIEWS[view])(main).then(() => paintLegend(main));
  }

  const VIEWS = {
    async overview(main) {
      const o = await api('/overview'), lab = o.series.map(d => d.day.slice(0, 10)), col = k => o.series.map(d => d[k]);
      main.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'Overview'), h('span', { class: 'muted' }, 'Last 30 days · models retrain every ≤5 min')),
        h('div', { class: 'grid kpis' },
          kpi('Players', num(o.players), `${num(o.new7)} new this week`), kpi('Active today / 7d / 30d', `${o.dau} / ${o.wau} / ${o.mau}`, `Stickiness ${o.mau ? (100 * o.dau / o.mau).toFixed(0) : 0}%`),
          kpi('Total play time', num(o.play_hours, 1) + ' h', `${num(o.rounds)} rounds · avg ${o.avg_round_s}s`), kpi('Stars caught', num(o.stars), `${num(o.bombs)} bombs hit`),
          kpi('Money invested', num(o.invested_coins) + ' 🪙', `${num(o.diamonds_spent)} 💎 spent · ${o.payers} buyers`), kpi('Coins in wallets', num(o.coins_circulating), `${num(o.coins_earned)} earned all-time`),
          kpi('At-risk players', num(o.at_risk), 'churn risk > 70% (AI)', o.at_risk > 0), kpi('Suspicious rounds', num(o.flagged_rounds), 'autoencoder (AI)', o.flagged_rounds > 0)),
        h('div', { class: 'grid two' },
          card('Daily active players', chart(lab, [{ name: 'DAU', color: 'var(--blue)', data: col('dau') }], o.forecast)),
          card('Rounds & new signups', chart(lab, [{ name: 'Rounds', color: 'var(--brand)', data: col('rounds') }, { name: 'Signups', color: 'var(--green)', data: col('signups') }])),
          card('Stars caught per day', chart(lab, [{ name: 'Stars', color: 'var(--violet)', data: col('stars') }])),
          card('Play minutes & 💎 spent per day', chart(lab, [{ name: 'Minutes', color: 'var(--blue)', data: col('minutes') }, { name: 'Diamonds', color: 'var(--red)', data: col('diamonds') }]))),
        card('Player segments (k-means)', h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ['Segment', 'Players', 'Days since play', 'Rounds / 7d', '💎 spent', 'Avg churn risk'].map(x => h('th', { class: 'nosort' }, x)))),
          h('tbody', {}, o.segments.map(s => h('tr', {}, h('td', {}, s.name), h('td', {}, s.players), h('td', {}, s.avg_days_since_play), h('td', {}, s.rounds_7d), h('td', {}, s.avg_diamonds_spent), h('td', {}, pct(s.avg_churn)))))))));
      if (!o.players) main.append(h('p', { class: 'muted' }, 'No players yet. For a preview run: npm run seed'));
    },

    async players(main) {
      const st = { q: '', sort: 'joined', dir: 'desc', page: 0 }, tbody = h('tbody'), info = h('span', { class: 'muted' });
      const cols = [['Player', null], ['Joined', 'joined'], ['Last seen', 'last_seen'], ['Rounds', 'rounds'], ['Play time', 'play'], ['⭐ Stars', 'stars'], ['Best', 'best'], ['🪙 Coins', 'coins'], ['💎 Spent', 'spent'], ['Invested 🪙', 'spent'], ['Churn', null], ['Segment', null], ['Flags', null]];
      const head = h('tr', {}, cols.map(([l, k]) => h('th', { class: k ? '' : 'nosort', on: k ? { click: () => { st.dir = st.sort === k && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = k; st.page = 0; load(); } } : {} }, l)));
      const load = guard(async () => {
        const r = await api(`/players?q=${encodeURIComponent(st.q)}&sort=${st.sort}&dir=${st.dir}&page=${st.page}`);
        info.textContent = `${num(r.total)} players`;
        tbody.replaceChildren(...r.rows.map(p => h('tr', { class: 'click', tabindex: 0, on: { click: () => detail(p.id), keydown: e => e.key === 'Enter' && detail(p.id) } },
          h('td', {}, p.email || p.id.slice(0, 10), p.is_demo ? h('span', { class: 'chip' }, 'demo') : null), h('td', {}, new Date(p.created_at).toLocaleDateString()), h('td', {}, ago(p.last_seen)), h('td', {}, p.rounds), h('td', {}, dur(p.play_min)), h('td', {}, num(p.stars)),
          h('td', {}, num(p.best)), h('td', {}, num(p.coins)), h('td', {}, p.diamonds_spent), h('td', {}, num(p.invested_coins)), h('td', {}, p.churn == null ? '–' : h('span', { class: 'pill ' + (p.churn > .7 ? 'high' : p.churn > .4 ? 'medium' : 'low') }, pct(p.churn))),
          h('td', {}, p.segment || '–'), h('td', {}, p.banned ? h('span', { class: 'pill banned' }, 'banned') : null, p.anomalies ? h('span', { class: 'pill high' }, `⚠ ${p.anomalies}`) : null))));
        pager.replaceChildren(h('button', { disabled: st.page === 0, on: { click: () => { st.page--; load(); } } }, '‹ Prev'), h('span', { class: 'muted' }, ` page ${st.page + 1} `), h('button', { disabled: (st.page + 1) * 25 >= r.total, on: { click: () => { st.page++; load(); } } }, 'Next ›'));
      });
      const pager = h('div', { class: 'row' }), search = h('input', { type: 'search', placeholder: 'Search email…', 'aria-label': 'Search players', on: { input: e => { clearTimeout(search.t); search.t = setTimeout(() => { st.q = e.target.value; st.page = 0; load(); }, 300); } } });
      main.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'Players'), info, me.role === 'owner' ? h('a', { href: '/admin/api/export/players.csv', class: 'right' }, h('button', {}, '⬇ Export CSV')) : null),
        h('div', { class: 'card' }, search, h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, head), tbody)), pager));
      await load();
    },

    async economy(main) {
      const e = await api('/economy'), mx = Math.max(1, ...e.items.map(i => i.diamonds));
      main.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'Economy')),
        h('div', { class: 'grid kpis' }, kpi('Coins earned', num(e.earned), 'all-time, from rounds'), kpi('Coins held', num(e.coins_held), 'in player wallets'), kpi('Diamonds held', num(e.diamonds_held), 'unspent'),
          kpi('Exchange rate', `1 💎 = ${e.coin_per_diamond} 🪙`, 'used for "money invested"'), ...e.kinds.map(k => kpi(k.kind, num(k.n), k.kind === 'exchange' ? `${num(k.coins)} coins converted` : `${num(k.diamonds)} 💎`))),
        card('Store performance', h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ['Item', 'Type', 'Buyers', '💎 revenue', ''].map(x => h('th', { class: 'nosort' }, x)))),
          h('tbody', {}, e.items.map(i => { const b = h('i'); b.style.width = (100 * i.diamonds / mx) + '%'; return h('tr', {}, h('td', {}, i.item), h('td', {}, i.kind), h('td', {}, i.buyers), h('td', {}, i.diamonds), h('td', { style: false }, h('div', { class: 'bar' }, b))); }))))));
    },

    async ai(main) {
      const d = await api('/ai'); let rep = d.report;
      const out = h('div'), btn = h('button', { class: 'primary', on: { click: guard(async () => { btn.disabled = true; btn.textContent = 'Analysing…'; try { rep = (await api('/ai/run', 'POST')).report; paint(); } finally { btn.disabled = false; btn.textContent = '✨ Run AI analysis'; } }) } }, '✨ Run AI analysis');
      const m = d.models, mc = (t, big, sub) => h('div', { class: 'card kpi' }, h('h3', {}, t), h('div', { class: 'v' }, big), h('div', { class: 's' }, sub));
      const ev = rep ? Object.fromEntries(rep.evidence.map(e => [e.id, e.text])) : {};
      const chips = ids => ids.map(i => h('span', { class: 'chip', title: ev[i] || '' }, i));
      const sim = r => !r.simulation ? null : h('div', { class: 'muted' }, `Model what-if: ${r.lever.feature} ${r.lever.change_pct > 0 ? '+' : ''}${r.lever.change_pct}% for "${r.lever.segment}" (${r.simulation.players} players) → churn ${pct(r.simulation.before)} → ${pct(r.simulation.after)} (${r.simulation.delta_pp > 0 ? '+' : ''}${r.simulation.delta_pp} pp). Correlational, not causal.`);
      function paint() {
        out.replaceChildren(!rep ? h('p', { class: 'muted' }, 'No report yet. Click “Run AI analysis”.') : h('div', { class: 'grid' },
          card(`Summary · ${rep.source === 'rules' ? 'rule-based (no foundation model key)' : rep.source} · ${ago(rep.generated_at)}`, h('p', {}, rep.summary)),
          h('div', { class: 'grid two' },
            card('Insights', rep.insights.map(i => h('div', { class: 'item' }, h('div', { class: 'row' }, h('span', { class: 'pill ' + i.severity }, i.severity), h('b', {}, i.title)), h('div', {}, i.detail), chips(i.evidence)))),
            card('Recommendations (verified by the models)', rep.recommendations.map(r => h('div', { class: 'item' }, h('div', { class: 'row' }, h('span', { class: 'pill ' + r.verdict }, r.verdict), h('span', { class: 'pill' }, r.audience), h('b', {}, r.title)), h('div', {}, r.action), sim(r), chips(r.evidence)))))));
      }
      main.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'AI Insights'), btn),
        h('div', { class: 'grid kpis' },
          mc('Churn · logistic regression', m.churn.auc == null ? 'n/a' : 'AUC ' + m.churn.auc.toFixed(2), `${m.churn.type}, ${m.churn.n} players`), mc('Segments · k-means++', m.segmentation.segments.length, m.segmentation.segments.map(s => s.name).join(', ') || 'need more players'),
          mc('Cheat detection · autoencoder', num(m.anomaly.flagged), `suspicious of ${num(m.anomaly.rounds)} rounds`), mc('Forecast · Holt', m.forecast.next7_dau.length ? num(m.forecast.next7_dau.at(-1), 1) : 'n/a', 'DAU in 7 days')),
        out,
        h('div', { class: 'grid two' },
          card('Top at-risk players', h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ['Player', 'Risk', 'Segment', 'Days away', 'Rounds 7d'].map(x => h('th', { class: 'nosort' }, x)))),
            h('tbody', {}, d.at_risk.map(p => h('tr', { class: 'click', on: { click: () => detail(p.id) } }, h('td', {}, p.email || p.id.slice(0, 10)), h('td', {}, pct(p.churn)), h('td', {}, p.segment || '–'), h('td', {}, p.days_since_play), h('td', {}, p.rounds_7d))))))),
          card('Anomalous rounds (possible cheating)', h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ['Player', 'When', 'Score', 'Stars', 'Secs', 'Error'].map(x => h('th', { class: 'nosort' }, x)))),
            h('tbody', {}, d.anomalies.map(a => h('tr', { class: 'click', on: { click: () => detail(a.user_id) } }, h('td', {}, a.email || a.user_id.slice(0, 10)), h('td', {}, ago(a.at)), h('td', {}, a.score), h('td', {}, a.stars), h('td', {}, a.duration), h('td', {}, a.err)))))))));
      paint();
    },

    async security(main) {
      const msg = h('div', { class: 'err' }), cur = h('input', { type: 'password', autocomplete: 'current-password' }), nw = h('input', { type: 'password', autocomplete: 'new-password' });
      main.replaceChildren(h('div', { class: 'head' }, h('h1', {}, 'Security')), h('div', { class: 'grid two' },
        card('Your account', h('div', {}, h('p', {}, `${me.email} · ${me.role} · 2FA ${me.totp_on ? 'enabled' : 'OFF'}`), h('label', {}, 'Current password'), cur, h('label', {}, 'New password (12+ chars)'), nw, msg,
          h('p', {}, h('button', { on: { click: async () => { msg.className = 'err'; try { await api('/password', 'POST', { current: cur.value, next: nw.value }); msg.className = 'ok'; msg.textContent = 'Password changed. Other sessions signed out.'; cur.value = nw.value = ''; } catch (x) { msg.textContent = x.message; } } } }, 'Change password')))),
        card('Hardening in place', h('ul', {}, ['scrypt password hashing, 12+ char policy', 'TOTP 2FA required for all staff', 'HttpOnly + SameSite=Strict cookie, hashed session tokens, 30 min idle / 8 h max', 'CSRF header + Origin check on every write', 'Login throttling per IP and 5-strike account lockout', 'Strict CSP: no inline scripts, no third-party code', 'Roles: owner / developer · emails masked for developers', 'Full audit log of staff actions', 'AI model only receives aggregates, never emails or IDs'].map(x => h('li', {}, x))))));
      if (me.role !== 'owner') return;
      const [ad, au] = await Promise.all([api('/admins'), api('/audit')]);
      const em = h('input', { type: 'email' }), pw = h('input', { type: 'password', autocomplete: 'new-password' }), role = h('select', {}, h('option', { value: 'developer' }, 'developer'), h('option', { value: 'owner' }, 'owner')), m2 = h('div', { class: 'err' });
      const act = (id, body) => guard(async () => { await api('/admins/' + id, 'POST', body); VIEWS.security(main); });
      main.append(h('div', { class: 'grid two' },
        card('Staff accounts', h('div', {}, h('table', {}, h('tbody', {}, ad.rows.map(a => h('tr', {}, h('td', {}, a.email), h('td', {}, a.role), h('td', {}, a.totp_on ? '2FA ✓' : '2FA ✗'), h('td', {}, a.disabled ? h('span', { class: 'pill banned' }, 'disabled') : ago(a.last_login)),
          h('td', {}, a.email === me.email ? '' : [h('button', { on: { click: act(a.id, { disabled: !a.disabled }) } }, a.disabled ? 'Enable' : 'Disable'), ' ', h('button', { on: { click: act(a.id, { reset_2fa: true }) } }, 'Reset 2FA')]))))),
          h('h3', {}, 'Add staff'), h('label', {}, 'Email'), em, h('label', {}, 'Role'), role, h('label', {}, 'Initial password (they should change it)'), pw, m2,
          h('p', {}, h('button', { on: { click: async () => { m2.textContent = ''; try { await api('/admins', 'POST', { email: em.value, role: role.value, password: pw.value }); VIEWS.security(main); } catch (x) { m2.textContent = x.message; } } } }, 'Create')))),
        card('Audit log (latest 200)', h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, ['When', 'Who', 'Action', 'Target', 'IP'].map(x => h('th', { class: 'nosort' }, x)))),
          h('tbody', {}, au.rows.map(r => h('tr', {}, h('td', {}, new Date(r.at).toLocaleString()), h('td', {}, r.admin_email || ''), h('td', {}, r.action), h('td', {}, r.target || ''), h('td', {}, r.ip || '')))))))));
    },
  };

  // ── player detail modal ──
  const detail = guard(async id => {
    const d = await api('/players/' + encodeURIComponent(id)), p = d.player;
    const close = () => m.remove();
    const rows = (cols, data) => h('div', { class: 'scroll' }, h('table', {}, h('thead', {}, h('tr', {}, cols.map(c => h('th', { class: 'nosort' }, c[0])))), h('tbody', {}, data.map(r => h('tr', {}, cols.map(c => h('td', {}, c[1](r))))))));
    const m = h('div', { class: 'modal', on: { click: e => e.target === m && close() } }, h('div', { class: 'card', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'row' }, h('h2', {}, p.email || p.id), p.banned ? h('span', { class: 'pill banned' }, 'banned') : null, h('button', { class: 'right', on: { click: close } }, '✕')),
      h('div', { class: 'grid kpis' }, kpi('Play time', dur(p.play_min), `${p.rounds} rounds`), kpi('⭐ Stars', num(p.stars), `best score ${num(p.best)}`), kpi('Wallet', `${num(p.coins)} 🪙`, `${p.diamonds} 💎`), kpi('Invested', `${num(p.invested_coins)} 🪙`, `${p.diamonds_spent} 💎 spent`),
        kpi('Churn risk', pct(p.churn), p.segment || 'no segment', p.churn > .7), kpi('Anomalies', p.anomalies, 'flagged rounds', p.anomalies > 0)),
      h('p', { class: 'muted' }, `Joined ${new Date(p.created_at).toLocaleString()} · last seen ${ago(p.last_seen)} · skin ${d.loadout?.skin || '–'} · owns ${(d.loadout?.owned || []).concat(d.loadout?.acc || []).join(', ') || '–'}`),
      h('h3', {}, 'Recent rounds'), rows([['When', r => ago(r.at)], ['Score', r => r.score], ['Stars', r => r.stars], ['Bombs', r => r.bombs], ['Power-ups', r => r.powerups], ['Secs', r => r.duration.toFixed(0)], ['Coins', r => r.coins]], d.rounds),
      h('h3', {}, 'Purchases'), d.purchases.length ? rows([['When', r => ago(r.at)], ['Type', r => r.kind], ['Item', r => r.item], ['💎', r => r.diamonds], ['🪙', r => r.coins]], d.purchases) : h('p', { class: 'muted' }, 'None'),
      h('div', { class: 'row' }, h('button', { class: p.banned ? '' : 'danger', on: { click: guard(async () => { if (!p.banned && !confirm('Ban this player? They will be blocked from saving progress.')) return; await api(`/players/${encodeURIComponent(id)}/ban`, 'POST', { banned: !p.banned }); close(); shell(); }) } }, p.banned ? 'Unban' : 'Ban player'),
        me.role === 'owner' ? h('button', { class: 'danger', on: { click: guard(async () => { if (prompt('Permanently delete this player and all their data? Type "delete" to confirm.') !== 'delete') return; await api('/players/' + encodeURIComponent(id), 'DELETE', { confirm: 'delete' }); close(); shell(); }) } }, 'Delete data (GDPR)') : null)));
    document.body.append(m);
  });

  async function boot() {
    try { me = await api('/me'); } catch (e) { return; }
    if (me.must_enroll_2fa) return renderEnroll();
    shell();
  }
  api('/me').then(m => { me = m; me.must_enroll_2fa ? renderEnroll() : shell(); }).catch(() => renderLogin());
})();
