CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tracks (
  track_id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  problem_statement TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panels (
  panel_id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  track_id INTEGER REFERENCES tracks(track_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  team_id SERIAL PRIMARY KEY,
  team_name VARCHAR(200) NOT NULL,
  problem_statement TEXT,
  idea TEXT,
  track_id INTEGER REFERENCES tracks(track_id) ON DELETE CASCADE,
  panel_id INTEGER REFERENCES panels(panel_id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'pending', -- accepted, rejected, pending (for elim)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE, -- vit email
  password_hash VARCHAR(200) NOT NULL,
  team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  extra_info JSONB,
  hostel_block VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  admin_id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  panel_id INTEGER REFERENCES panels(panel_id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'judge',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  submission_id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(team_id) ON DELETE CASCADE,
  submitted_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,    -- review1, review2, final, etc.
  title VARCHAR(255),
  description TEXT,
  links JSONB,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',   -- submitted, pending
  review_round SMALLINT DEFAULT 0,        -- 0 is no review, 1 = review1, 2 = review2
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  review_id SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(submission_id) ON DELETE CASCADE,
  judge_id INTEGER REFERENCES admins(admin_id) ON DELETE SET NULL,
  score NUMERIC(5,2),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL,
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- for review sessions
CREATE TABLE IF NOT EXISTS submission_windows (
  window_id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- review1, review2, final
  open BOOLEAN NOT NULL DEFAULT false,
  start_at TIMESTAMP WITH TIME ZONE NULL,
  end_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_phase VARCHAR(100) NOT NULL DEFAULT 'Participants reach',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- base seed
INSERT INTO submission_windows (name, open)
VALUES
  ('review1', false),
  ('review2', false),
  ('final', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO event_status (id, current_phase)
VALUES (1, 'Participants reach')
ON CONFLICT (id) DO NOTHING;


CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

CREATE INDEX IF NOT EXISTS idx_submission_windows_name ON submission_windows (name);
CREATE INDEX IF NOT EXISTS idx_users_hostel_block ON users(hostel_block);
