-- Migration: 002_rank_snapshots (UP)
-- Stores historical rank snapshots for summoners.
-- Append-only: each row is one point-in-time capture.
-- Deduplication is enforced at the application layer (1-hour window).

CREATE TABLE IF NOT EXISTS rank_snapshots (
    id            SERIAL       PRIMARY KEY,
    puuid         VARCHAR(78)  NOT NULL REFERENCES summoners(puuid) ON DELETE CASCADE,
    queue_type    VARCHAR(30)  NOT NULL,   -- e.g. RANKED_SOLO_5x5 | RANKED_FLEX_SR
    tier          VARCHAR(20)  NOT NULL,   -- e.g. GOLD | PLATINUM | GRANDMASTER
    rank          VARCHAR(5)   NOT NULL,   -- e.g. I | II | III | IV
    league_points INTEGER      NOT NULL DEFAULT 0,
    wins          INTEGER      NOT NULL DEFAULT 0,
    losses        INTEGER      NOT NULL DEFAULT 0,
    hot_streak    BOOLEAN      NOT NULL DEFAULT FALSE,
    veteran       BOOLEAN      NOT NULL DEFAULT FALSE,
    fresh_blood   BOOLEAN      NOT NULL DEFAULT FALSE,
    inactive      BOOLEAN      NOT NULL DEFAULT FALSE,
    recorded_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Latest snapshot per player+queue (used for current-rank lookups)
CREATE INDEX IF NOT EXISTS idx_rank_snapshots_puuid_queue_time
    ON rank_snapshots(puuid, queue_type, recorded_at DESC);

-- All snapshots for a player, time-ordered (used for LP-history chart)
CREATE INDEX IF NOT EXISTS idx_rank_snapshots_puuid_time
    ON rank_snapshots(puuid, recorded_at DESC);
