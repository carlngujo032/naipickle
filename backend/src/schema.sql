-- Pickleball Open Play — schema for Neon (Postgres)

CREATE TABLE IF NOT EXISTS rooms (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(8) UNIQUE NOT NULL,
  title         VARCHAR(120) NOT NULL,
  password_hash TEXT,
  host_token    VARCHAR(64) NOT NULL,
  max_players   INTEGER NOT NULL DEFAULT 24,
  max_courts    INTEGER NOT NULL DEFAULT 4,
  status        VARCHAR(20) NOT NULL DEFAULT 'open', -- open | closed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS players (
  id             SERIAL PRIMARY KEY,
  room_id        INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name           VARCHAR(60) NOT NULL,
  skill_level    NUMERIC(3,1) DEFAULT 3.0, -- 2.0 to 5.0 DUPR-style
  status         VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting | playing | break | inactive
  games_played   INTEGER NOT NULL DEFAULT 0,
  wins           INTEGER NOT NULL DEFAULT 0,
  losses         INTEGER NOT NULL DEFAULT 0,
  points_for     INTEGER NOT NULL DEFAULT 0,
  points_against INTEGER NOT NULL DEFAULT 0,
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_played_at TIMESTAMPTZ,
  player_token   VARCHAR(64) -- lets a player manage their own break from their own device
);

-- for databases created before player_token existed (safe to re-run)
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_token VARCHAR(64);

CREATE TABLE IF NOT EXISTS courts (
  id            SERIAL PRIMARY KEY,
  room_id       INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  court_number  INTEGER NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'empty', -- empty | playing
  UNIQUE(room_id, court_number)
);

CREATE TABLE IF NOT EXISTS matches (
  id           SERIAL PRIMARY KEY,
  room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  court_id     INTEGER NOT NULL REFERENCES courts(id) ON DELETE CASCADE,
  team1_p1     INTEGER REFERENCES players(id),
  team1_p2     INTEGER REFERENCES players(id),
  team2_p1     INTEGER REFERENCES players(id),
  team2_p2     INTEGER REFERENCES players(id),
  score1       INTEGER,
  score2       INTEGER,
  status       VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress | finished
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_courts_room ON courts(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_room ON matches(room_id);
