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
  track_id INTEGER REFERENCES tracks(track_id) ON DELETE SET NULL,
  panel_id INTEGER REFERENCES panels(panel_id) ON DELETE SET NULL,
  status VARCHAR(32) DEFAULT 'pending', -- accepted, rejected, pending (for elim)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE, -- vit email
  team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
  is_leader BOOLEAN DEFAULT FALSE,
  extra_info JSONB,
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
  type VARCHAR(50) NOT NULL, -- review, final
  title VARCHAR(255),
  description TEXT,
  link_url TEXT,
  file_url TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- submitted, pending
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
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