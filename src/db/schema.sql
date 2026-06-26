-- Выполните этот файл один раз на вашей Postgres-базе перед первым запуском.
-- Например: psql "$DATABASE_URL" -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  fio TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  position TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  format TEXT NOT NULL DEFAULT 'offline', -- 'offline' | 'online'
  location TEXT DEFAULT '',
  link TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_participants (
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

-- Связь "наш пользователь" <-> "его подключённый Google-аккаунт в Composio"
CREATE TABLE IF NOT EXISTS google_connections (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  composio_connected_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INITIATED', -- 'INITIATED' | 'ACTIVE' | 'FAILED' | ...
  created_at TIMESTAMPTZ DEFAULT now()
);
