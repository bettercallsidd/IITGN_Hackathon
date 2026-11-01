// Idempotent migrations. Player tables first, then admin tables (kept separate: admins are never players).
module.exports = `
CREATE TABLE IF NOT EXISTS users(
  id text PRIMARY KEY, email text, state jsonb, updated_at timestamptz DEFAULT now());
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen  timestamptz DEFAULT now();
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS rounds(
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  duration real NOT NULL, score int NOT NULL, stars int NOT NULL, bombs int NOT NULL,
  powerups int NOT NULL DEFAULT 0, coins int NOT NULL DEFAULT 0, skin text);
CREATE INDEX IF NOT EXISTS rounds_user_at ON rounds(user_id, at);
CREATE INDEX IF NOT EXISTS rounds_at ON rounds(at);

CREATE TABLE IF NOT EXISTS purchases(
  id bigserial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL, item text NOT NULL, diamonds int NOT NULL DEFAULT 0, coins int NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS purchases_at ON purchases(at);

CREATE TABLE IF NOT EXISTS admins(
  id serial PRIMARY KEY, email text UNIQUE NOT NULL, pw_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','developer')),
  totp_secret text, totp_on boolean NOT NULL DEFAULT false,
  fails int NOT NULL DEFAULT 0, locked_until timestamptz,
  disabled boolean NOT NULL DEFAULT false, created_at timestamptz DEFAULT now(), last_login timestamptz);

CREATE TABLE IF NOT EXISTS admin_sessions(
  token_hash text PRIMARY KEY, admin_id int NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf text NOT NULL, ip text, ua text,
  created_at timestamptz DEFAULT now(), last_used timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS audit_log(
  id bigserial PRIMARY KEY, at timestamptz DEFAULT now(), admin_email text, action text NOT NULL,
  target text, detail jsonb, ip text);

CREATE TABLE IF NOT EXISTS ai_reports(
  id serial PRIMARY KEY, at timestamptz DEFAULT now(), source text NOT NULL, report jsonb NOT NULL);
`;
