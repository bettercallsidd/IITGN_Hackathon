// Foundation-model layer. Novel part: the LLM never sees raw players and is never trusted on its own.
//   1. GROUND  – ML/DL outputs + KPIs become a numbered evidence ledger (aggregates only, no emails/ids leave the server).
//   2. PROPOSE – Claude writes insights/recommendations that must cite ledger ids and name a machine-readable "lever".
//   3. VERIFY  – uncited items are dropped; each lever is replayed through the churn model (what-if simulator).
//   4. RANK    – recommendations the models can't support are demoted/flagged; supported ones sorted by simulated impact.
// No ANTHROPIC_API_KEY (or API failure) -> the same pipeline runs with a rule-based proposer, so the dashboard never breaks.
const { LEVERS } = require('./ml');
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

function buildLedger(ov, ml) {
  const L = [], add = text => L.push({ id: 'E' + (L.length + 1), text });
  add(`Players: ${ov.players} total, DAU ${ov.dau}, WAU ${ov.wau}, MAU ${ov.mau}, ${ov.new7} new in last 7 days.`);
  add(`Stickiness (DAU/MAU) is ${ov.mau ? (100 * ov.dau / ov.mau).toFixed(1) : 0}%. Avg ${ov.rounds_per_player} rounds/player, avg round ${ov.avg_round_s}s, total play time ${ov.play_hours}h, ${ov.stars} stars caught.`);
  add(`Economy: ${ov.diamonds_spent} diamonds spent on items (~${ov.invested_coins} coin-equivalent invested), ${ov.coins_circulating} coins held by players, ${ov.payers} players (${ov.players ? (100 * ov.payers / ov.players).toFixed(1) : 0}%) have bought something.`);
  if (ov.top_items.length) add(`Best-selling items: ${ov.top_items.map(i => `${i.item} (${i.n})`).join(', ')}.`);
  const m = ml.models;
  add(`Churn model: ${m.churn.type}, ${m.churn.n} training players, held-out AUC ${m.churn.auc == null ? 'n/a' : m.churn.auc.toFixed(2)}, base churn rate ${m.churn.base_rate == null ? 'n/a' : (100 * m.churn.base_rate).toFixed(0) + '%'}.`);
  if (m.churn.weights) add(`Churn drivers (logistic weights, + raises churn): ${Object.entries(m.churn.weights).map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  m.segmentation.segments.forEach(s => add(`Segment "${s.name}": ${s.players} players, ${s.avg_days_since_play}d since last play, ${s.rounds_7d} rounds/7d, ${s.avg_diamonds_spent} diamonds spent, mean churn risk ${(100 * s.avg_churn).toFixed(0)}%.`));
  const hi = Object.values(ml.players).filter(p => p.churn > .7).length;
  add(`${hi} active-history players have predicted churn risk above 70%.`);
  add(`Anomaly autoencoder flagged ${m.anomaly.flagged} of ${m.anomaly.rounds} rounds (RMS error>1 in standardized units) across ${new Set(ml.flagged.map(f => f.user_id)).size} players, worst error ${ml.flagged[0] ? ml.flagged[0].err : 0}. Progress is client-reported so this may indicate cheating.`);
  if (m.forecast.next7_dau.length) add(`DAU forecast next 7 days (Holt): ${m.forecast.next7_dau.join(', ')} (rmse ${m.forecast.rmse}).`);
  return L;
}

function ruleProposer(ov, ml, L) {
  const ids = re => L.filter(e => re.test(e.text)).map(e => e.id), seg = ml.models.segmentation.segments;
  const insights = [], recs = [];
  const lapsed = seg.find(s => s.name === 'Lapsed');
  if (lapsed && ov.players && lapsed.players / ov.players > .2) {
    insights.push({ title: 'Large lapsed cohort', severity: 'high', detail: `${lapsed.players} players (${(100 * lapsed.players / ov.players).toFixed(0)}%) are lapsed with ${lapsed.avg_days_since_play} days since last play.`, evidence: ids(/Segment "Lapsed"/) });
    recs.push({ title: 'Win-back campaign', audience: 'owner', action: 'Send a return bonus (free diamonds or a limited skin) to lapsed players.', evidence: ids(/Segment "Lapsed"/), lever: { segment: 'Lapsed', feature: 'freq7', change_pct: 100 } });
  }
  if (ov.rounds_per_player && ml.models.churn.weights && ml.models.churn.weights.bomb_rate > 0) {
    insights.push({ title: 'Bomb rate pushes players away', severity: 'medium', detail: 'The churn model associates a higher share of bombs with leaving.', evidence: ids(/Churn drivers/) });
    recs.push({ title: 'Soften early difficulty', audience: 'developer', action: 'Lower bomb spawn weight in the first rounds or add a one-time shield for new players.', evidence: ids(/Churn drivers/), lever: { segment: 'all', feature: 'bomb_rate', change_pct: -15 } });
  }
  if (ml.models.anomaly.flagged) {
    insights.push({ title: 'Suspicious rounds detected', severity: 'high', detail: `${ml.models.anomaly.flagged} rounds look unlike normal play.`, evidence: ids(/Anomaly autoencoder/) });
    recs.push({ title: 'Review flagged players', audience: 'developer', action: 'Open AI Insights > Anomalies, check the rounds, and ban confirmed cheaters. Consider server-side score validation.', evidence: ids(/Anomaly autoencoder/), lever: null });
  }
  if (!insights.length) insights.push({ title: 'Not enough signal yet', severity: 'low', detail: 'Collect more rounds for stronger insights.', evidence: ids(/^Players/) });
  return { summary: `${ov.players} players, DAU ${ov.dau}. Rule-based analysis (no foundation model configured).`, insights, recommendations: recs };
}

async function callClaude(L) {
  const system = `You are a game-analytics advisor for the owner and developers of "BombDodger" (a casual catch-the-stars game).
Use ONLY the numbered evidence below. Every insight and recommendation must cite evidence ids that exist. Never invent numbers.
Return ONLY JSON: {"summary":str,"insights":[{"title":str,"severity":"low|medium|high","detail":str,"evidence":["E1"]}],"recommendations":[{"title":str,"audience":"owner|developer","action":str,"evidence":["E1"],"lever":null|{"segment":str,"feature":str,"change_pct":number}}]}.
A lever is a testable change replayed through the churn model. feature must be one of ${LEVERS.join(', ')}; segment is "all" or one of the segment names in the evidence; change_pct in [-100,100]. Use lever:null when no lever fits.
Max 5 insights, 5 recommendations. Be specific and concise.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(45000),
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: 'EVIDENCE\n' + L.map(e => `${e.id}: ${e.text}`).join('\n') }] }),
  });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const t = (await r.json()).content.map(c => c.text || '').join('');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}

const str = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
async function generate(ov, ml) {
  const L = buildLedger(ov, ml), valid = new Set(L.map(e => e.id));
  let raw, source = 'rules';
  if (process.env.ANTHROPIC_API_KEY) try { raw = await callClaude(L); source = MODEL; } catch (e) { console.error('AI proposer failed:', e.message); }
  raw = raw || ruleProposer(ov, ml, L);
  const cite = e => (Array.isArray(e) ? e : []).filter(x => valid.has(x));   // VERIFY: citations must exist
  const insights = (raw.insights || []).slice(0, 5).map(i => ({ title: str(i.title, 120), severity: ['low', 'medium', 'high'].includes(i.severity) ? i.severity : 'low', detail: str(i.detail, 600), evidence: cite(i.evidence) })).filter(i => i.title && i.evidence.length);
  const recommendations = (raw.recommendations || []).slice(0, 5).map(r => {
    const out = { title: str(r.title, 120), audience: r.audience === 'owner' ? 'owner' : 'developer', action: str(r.action, 600), evidence: cite(r.evidence), lever: null, simulation: null, verdict: 'unsimulated' };
    if (r.lever && typeof r.lever === 'object') {
      const lv = { segment: str(r.lever.segment, 40), feature: str(r.lever.feature, 20), change_pct: Number(r.lever.change_pct) };
      if (lv.segment !== 'all' && !ml.segments.includes(lv.segment)) lv.segment = 'all';
      const sim = ml.whatIf(lv.segment, lv.feature, lv.change_pct);   // RANK: the model, not the LLM, decides if it helps
      if (sim) { out.lever = lv; out.simulation = sim; out.verdict = !sim.reliable ? 'low-confidence' : sim.delta_pp < -0.05 ? 'supported' : 'not-supported'; }
    }
    return out;
  }).filter(r => r.title && r.evidence.length);
  const rank = { supported: 0, unsimulated: 1, 'low-confidence': 2, 'not-supported': 3 };
  recommendations.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.simulation?.delta_pp ?? 0) - (b.simulation?.delta_pp ?? 0));
  return { generated_at: new Date().toISOString(), source, summary: str(raw.summary, 400), insights, recommendations, evidence: L, models: ml.models };
}

module.exports = { generate };
