-- TaskFlow AI task storage.
-- This migration is additive and does not alter QueryNest document or vector tables.
-- user_id is intentionally a string so it can match the ID type selected for the
-- authentication provider. Add a foreign key after that user schema is finalized.

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL CHECK (length(btrim(user_id)) > 0),
  title VARCHAR(200) NOT NULL CHECK (length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx
  ON tasks (user_id);

CREATE INDEX IF NOT EXISTS tasks_user_status_idx
  ON tasks (user_id, status);

CREATE INDEX IF NOT EXISTS tasks_user_due_date_idx
  ON tasks (user_id, due_date)
  WHERE due_date IS NOT NULL;
