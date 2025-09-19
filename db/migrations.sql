-- add submission_windows, event_status, hostel_block in users, file_url in submissions
-- Migrates links->'file' to file_url if present.

BEGIN;

CREATE TABLE IF NOT EXISTS submission_windows (
  window_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- review1, review2, final
  open BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE NULL,
  end_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO submission_windows (name, open)
VALUES
  ('review1', false),
  ('review2', false),
  ('final', false)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS event_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_phase VARCHAR(100) NOT NULL DEFAULT 'Participants reach',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO event_status (id, current_phase)
VALUES (1, 'Participants reach')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hostel_block VARCHAR(50);

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS file_url TEXT;


CREATE INDEX IF NOT EXISTS idx_submission_windows_name ON submission_windows (name);
CREATE INDEX IF NOT EXISTS idx_users_hostel_block ON users(hostel_block);

COMMIT;
