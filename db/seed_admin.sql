
-- run only after schema created

-- tracks
INSERT INTO tracks (name, description, problem_statement) VALUES
  ('AI & Machine Learning', 'Solutions leveraging AI and ML models.', 'Develop an AI solution to predict student performance based on historical data.')
  ON CONFLICT (name) DO NOTHING;
INSERT INTO tracks (name, description, problem_statement) VALUES
  ('Web & Mobile App Development', 'Building dynamic and user-friendly applications.', 'Create a collaborative task management application for small teams.')
  ON CONFLICT (name) DO NOTHING;
INSERT INTO tracks (name, description, problem_statement) VALUES
  ('Cybersecurity', 'Focus on securing digital assets and networks.', 'Design a secure authentication system that is resistant to common attacks.')
  ON CONFLICT (name) DO NOTHING;

-- panels
INSERT INTO panels (name, track_id) VALUES
  ('Panel Alpha', (SELECT track_id FROM tracks WHERE name='AI & Machine Learning'))
  ON CONFLICT (name) DO NOTHING;
INSERT INTO panels (name, track_id) VALUES
  ('Panel Beta', (SELECT track_id FROM tracks WHERE name='Web & Mobile App Development'))
  ON CONFLICT (name) DO NOTHING;
INSERT INTO panels (name, track_id) VALUES
  ('Panel Gamma', (SELECT track_id FROM tracks WHERE name='Cybersecurity'))
  ON CONFLICT (name) DO NOTHING;

-- teams
INSERT INTO teams (team_name, problem_statement, idea, track_id, panel_id, status) VALUES
  ('Innovators', 'AI-powered student performance prediction.', 'A web-based platform using scikit-learn to forecast grades.', 
   (SELECT track_id FROM tracks WHERE name='AI & Machine Learning'),
   (SELECT panel_id FROM panels WHERE name='Panel Alpha'),
   'accepted')
  ON CONFLICT (team_name) DO NOTHING;

INSERT INTO teams (team_name, problem_statement, idea, track_id, panel_id, status) VALUES
  ('Byte Busters', 'Collaborative task management.', 'A mobile app with real-time updates and notifications.',
   (SELECT track_id FROM tracks WHERE name='Web & Mobile App Development'),
   (SELECT panel_id FROM panels WHERE name='Panel Beta'),
   'accepted')
  ON CONFLICT (team_name) DO NOTHING;

INSERT INTO teams (team_name, problem_statement, idea, track_id, panel_id, status) VALUES
  ('Cyber Guardians', 'Secure authentication system.', 'A multi-factor authentication library using biometric data.',
   (SELECT track_id FROM tracks WHERE name='Cybersecurity'),
   (SELECT panel_id FROM panels WHERE name='Panel Gamma'),
   'pending')
  ON CONFLICT (team_name) DO NOTHING;

INSERT INTO teams (team_name, problem_statement, idea, track_id, panel_id, status) VALUES
  ('Code Wizards', 'AI-powered student performance prediction.', 'A desktop application with predictive analytics.',
   (SELECT track_id FROM tracks WHERE name='AI & Machine Learning'),
   (SELECT panel_id FROM panels WHERE name='Panel Alpha'),
   'pending')
  ON CONFLICT (team_name) DO NOTHING;

-- ssers (password_hash is placeholder, replace with actual bcrypt hashes for login testing)
INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info) VALUES
  ('Alice Johnson', 'alice.johnson@vit.edu', '$2b$10$EXAMPLE_HASH_ALICE', (SELECT team_id FROM teams WHERE team_name='Innovators'), TRUE, '{"github":"alice_j"}')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info) VALUES
  ('Bob Williams', 'bob.williams@vit.edu', '$2b$10$EXAMPLE_HASH_BOB', (SELECT team_id FROM teams WHERE team_name='Innovators'), FALSE, '{"role":"backend"}')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info) VALUES
  ('Charlie Brown', 'charlie.brown@vit.edu', '$2b$10$EXAMPLE_HASH_CHARLIE', (SELECT team_id FROM teams WHERE team_name='Byte Busters'), TRUE, '{"favorite_lang":"Dart"}')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info) VALUES
  ('Diana Miller', 'diana.miller@vit.edu', '$2b$10$EXAMPLE_HASH_DIANA', (SELECT team_id FROM teams WHERE team_name='Byte Busters'), FALSE, '{"expertise":"UI/UX design"}')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password_hash, team_id, is_leader, extra_info) VALUES
  ('Eve Davis', 'eve.davis@vit.edu', '$2b$10$EXAMPLE_HASH_EVE', (SELECT team_id FROM teams WHERE team_name='Cyber Guardians'), TRUE, '{"linkedin":"eve-davis"}')
  ON CONFLICT (email) DO NOTHING;

-- admins: add a judge, an organizer, and a superadmin for testing requireSuperAdmin routes
INSERT INTO admins (name, email, password_hash, panel_id, role) VALUES
  ('Dr. Smith', 'smith.judge@vit.edu', '$2b$10$EXAMPLE_HASH_SMITH', (SELECT panel_id FROM panels WHERE name='Panel Alpha'), 'judge')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO admins (name, email, password_hash, panel_id, role) VALUES
  ('Prof. Jones', 'jones.judge@vit.edu', '$2b$10$EXAMPLE_HASH_JONES', (SELECT panel_id FROM panels WHERE name='Panel Beta'), 'judge')
  ON CONFLICT (email) DO NOTHING;

INSERT INTO admins (name, email, password_hash, panel_id, role) VALUES
  ('Alex Ray', 'alex.ray@vit.edu', '$2b$10$EXAMPLE_HASH_ALEX', NULL, 'organizer')
  ON CONFLICT (email) DO NOTHING;

-- superadmin (can be used for requireSuperAdmin routes)
INSERT INTO admins (name, email, password_hash, panel_id, role) VALUES
  ('Super Admin', 'superadmin@vit.edu', '$2b$10$EXAMPLE_HASH_SUPER', NULL, 'superadmin')
  ON CONFLICT (email) DO NOTHING;

-- submissions (use JSONB for links)
INSERT INTO submissions (team_id, submitted_by, type, title, description, links, review_round) VALUES
  ((SELECT team_id FROM teams WHERE team_name='Innovators'), (SELECT user_id FROM users WHERE email='alice.johnson@vit.edu'), 'review1', 'Innovators Review 1', 'Initial prototype and design documents for AI predictor.', '{"website":"http://innovators.link/proto"}', 1)
  ON CONFLICT DO NOTHING;

INSERT INTO submissions (team_id, submitted_by, type, title, description, links, review_round) VALUES
  ((SELECT team_id FROM teams WHERE team_name='Byte Busters'), (SELECT user_id FROM users WHERE email='charlie.brown@vit.edu'), 'review1', 'Byte Busters Review 1', 'UI mockups and early features.', '{"website":"http://bytebusters.link/mockups"}', 1)
  ON CONFLICT DO NOTHING;

-- reviews
INSERT INTO reviews (submission_id, judge_id, score, comments) VALUES
  ((SELECT submission_id FROM submissions WHERE title='Innovators Review 1'), (SELECT admin_id FROM admins WHERE email='smith.judge@vit.edu'), 85.50, 'Excellent progress on the data model. Suggest refining the UI.')
  ON CONFLICT DO NOTHING;

INSERT INTO reviews (submission_id, judge_id, score, comments) VALUES
  ((SELECT submission_id FROM submissions WHERE title='Byte Busters Review 1'), (SELECT admin_id FROM admins WHERE email='jones.judge@vit.edu'), 92.00, 'Very polished design. Good use of modern frameworks.')
  ON CONFLICT DO NOTHING;

-- token_blacklist demo rows
INSERT INTO token_blacklist (token) VALUES ('abc-123-xyz-456') ON CONFLICT DO NOTHING;
INSERT INTO token_blacklist (token) VALUES ('def-789-uvw-012') ON CONFLICT DO NOTHING;

-- event_status already has row inserted by schema, leave as is
