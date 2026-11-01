// Security primitives, stdlib only: scrypt passwords, RFC 6238 TOTP, AES-GCM for the TOTP secret at rest.
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);
const OPTS = { N: 1 << 15, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };

async function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return `s1$${salt.toString('base64')}$${(await scrypt(pw, salt, 64, OPTS)).toString('base64')}`;
}
async function verifyPw(pw, stored) {
  const [v, s, h] = String(stored).split('$');
  if (v !== 's1') return false;
  const want = Buffer.from(h, 'base64'), got = await scrypt(pw, Buffer.from(s, 'base64'), want.length, OPTS);
  return crypto.timingSafeEqual(want, got);
}
const DUMMY_HASH = 's1$' + Buffer.alloc(16).toString('base64') + '$' + Buffer.alloc(64).toString('base64');   // equalises timing for unknown emails

// Policy: >=12 chars, not trivially weak.
const pwProblem = pw => typeof pw !== 'string' || pw.length < 12 ? 'Password must be at least 12 characters.'
  : pw.length > 200 ? 'Password too long.' : /^(.)\1+$/.test(pw) || !/[a-z]/i.test(pw) || !/[0-9\W_]/.test(pw) ? 'Use letters plus a number or symbol.' : null;

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32 = buf => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
const unb32 = s => { let bits = ''; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0'); return Buffer.from(bits.match(/.{8}/g).map(b => parseInt(b, 2))); };
const newSecret = () => b32(crypto.randomBytes(20));
function hotp(key, counter) {
  const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', key).update(c).digest(), o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1e6).padStart(6, '0');
}
function totpOk(secretB32, code) {
  if (!/^\d{6}$/.test(String(code))) return false;
  const key = unb32(secretB32), t = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some(d => crypto.timingSafeEqual(Buffer.from(hotp(key, t + d)), Buffer.from(String(code))));   // ponytail: no replay cache within the 90s window
}

const K = () => crypto.createHash('sha256').update('totp|' + process.env.SESSION_SECRET).digest();
function seal(txt) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', K(), iv), ct = Buffer.concat([c.update(txt, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64')).join('.');
}
function unseal(s) {
  const [iv, tag, ct] = s.split('.').map(x => Buffer.from(x, 'base64')), d = crypto.createDecipheriv('aes-256-gcm', K(), iv);
  d.setAuthTag(tag); return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
}

const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const eq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };

module.exports = { hashPw, verifyPw, DUMMY_HASH, pwProblem, newSecret, totpOk, seal, unseal, sha, eq, hotp, unb32 };
