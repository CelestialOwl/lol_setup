-- Migration: 001_init (UP)
-- Idempotent: uses IF NOT EXISTS throughout, safe to re-run.
--
-- Key design decisions:
--   - participants.puuid has NO foreign-key to summoners.
--     All 10 players in a match are stored, but only the searched summoner
--     is guaranteed to exist in the summoners table. A FK would cause
--     constraint violations for every enemy/ally participant.
--   - Full match JSON is stored in matches.match_data (JSONB) so the frontend
--     never needs a second round-trip to reconstruct match details.
--   - participants holds only the columns needed for fast aggregate queries
--     (KDA, win rate, champion stats). Avoid adding a column per stat —
--     keep the wide stats in the JSONB blob.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── summoners ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS summoners (
    puuid          VARCHAR(78)  PRIMARY KEY,
    game_name      VARCHAR(100) NOT NULL,
    tag_line       VARCHAR(10)  NOT NULL,
    region         VARCHAR(10)  NOT NULL,
    summoner_level INTEGER      DEFAULT 0,
    profile_icon_id INTEGER     DEFAULT 0,
    last_updated   TIMESTAMP    DEFAULT NOW(),
    created_at     TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summoners_name_tag_region ON summoners(game_name, tag_line, region);
CREATE INDEX IF NOT EXISTS idx_summoners_last_updated    ON summoners(last_updated);

-- ── matches ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    match_id      VARCHAR(50) PRIMARY KEY,
    game_creation BIGINT      NOT NULL,
    game_duration INTEGER     DEFAULT 0,
    game_mode     VARCHAR(50),
    queue_id      INTEGER     DEFAULT 0,
    region        VARCHAR(10) NOT NULL,
    match_data    JSONB       NOT NULL,
    created_at    TIMESTAMP   DEFAULT NOW(),
    last_updated  TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_game_creation ON matches(game_creation DESC);
CREATE INDEX IF NOT EXISTS idx_matches_region        ON matches(region);
CREATE INDEX IF NOT EXISTS idx_matches_queue_id      ON matches(queue_id);

-- ── participants ─────────────────────────────────────────────────────────────
-- NOTE: puuid is intentionally NOT a FK to summoners.puuid.
--       All 10 players per match are stored here, but only the searched player
--       is guaranteed to be in the summoners table.
CREATE TABLE IF NOT EXISTS participants (
    id            SERIAL      PRIMARY KEY,
    match_id      VARCHAR(50) NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    puuid         VARCHAR(78) NOT NULL,   -- no FK — see note above
    champion_id   INTEGER     NOT NULL,
    champion_name VARCHAR(50) NOT NULL,
    kills         INTEGER     DEFAULT 0,
    deaths        INTEGER     DEFAULT 0,
    assists       INTEGER     DEFAULT 0,
    win           BOOLEAN     DEFAULT FALSE,
    total_damage  BIGINT      DEFAULT 0,
    gold_earned   INTEGER     DEFAULT 0,
    cs_score      INTEGER     DEFAULT 0,
    vision_score  INTEGER     DEFAULT 0,
    kda           DECIMAL(5,2) DEFAULT 0.00,
    created_at    TIMESTAMP   DEFAULT NOW(),
    UNIQUE(match_id, puuid)
);

CREATE INDEX IF NOT EXISTS idx_participants_puuid       ON participants(puuid);
CREATE INDEX IF NOT EXISTS idx_participants_match_id    ON participants(match_id);
CREATE INDEX IF NOT EXISTS idx_participants_champion_id ON participants(champion_id);
CREATE INDEX IF NOT EXISTS idx_participants_win         ON participants(win);

-- ── cache_entries (Postgres fallback for Redis) ──────────────────────────────
CREATE TABLE IF NOT EXISTS cache_entries (
    key        VARCHAR(255) PRIMARY KEY,
    value      JSONB        NOT NULL,
    expires_at TIMESTAMP    NOT NULL,
    created_at TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache_entries(expires_at);

-- ── helper function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cache_entries WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ── match_stats view ─────────────────────────────────────────────────────────
-- Aggregated win/loss stats per summoner for the last 30 days.
-- Used by GET /api/summoner/:puuid/stats
CREATE OR REPLACE VIEW match_stats AS
SELECT
    p.puuid,
    s.game_name,
    s.tag_line,
    COUNT(*)                                                        AS total_games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)                         AS wins,
    ROUND(
        (SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100,
        2
    )                                                               AS win_rate,
    ROUND(AVG(p.kills),        2)                                   AS avg_kills,
    ROUND(AVG(p.deaths),       2)                                   AS avg_deaths,
    ROUND(AVG(p.assists),      2)                                   AS avg_assists,
    ROUND(AVG(p.kda),          2)                                   AS avg_kda,
    ROUND(AVG(p.cs_score),     2)                                   AS avg_cs,
    ROUND(AVG(p.vision_score), 2)                                   AS avg_vision_score
FROM participants p
JOIN summoners s ON p.puuid = s.puuid
JOIN matches   m ON p.match_id = m.match_id
WHERE m.game_creation > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
GROUP BY p.puuid, s.game_name, s.tag_line;
