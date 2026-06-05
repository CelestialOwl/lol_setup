-- This file is intentionally left empty.
-- Schema is managed by golang-migrate using 001_init.up.sql / 001_init.down.sql.
-- Docker Compose mounts this directory into postgres initdb, which will pick up
-- 001_init.up.sql automatically on first container start (alphabetical order).


-- Summoners table
CREATE TABLE summoners (
    puuid VARCHAR(78) PRIMARY KEY,
    game_name VARCHAR(100) NOT NULL,
    tag_line VARCHAR(10) NOT NULL,
    region VARCHAR(10) NOT NULL,
    summoner_level INTEGER DEFAULT 0,
    profile_icon_id INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_summoners_name_tag_region ON summoners(game_name, tag_line, region);
CREATE INDEX idx_summoners_last_updated ON summoners(last_updated);

-- Matches table
CREATE TABLE matches (
    match_id VARCHAR(50) PRIMARY KEY,
    game_creation BIGINT NOT NULL,
    game_duration INTEGER DEFAULT 0,
    game_mode VARCHAR(50),
    queue_id INTEGER DEFAULT 0,
    region VARCHAR(10) NOT NULL,
    match_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_game_creation ON matches(game_creation DESC);
CREATE INDEX idx_matches_region ON matches(region);
CREATE INDEX idx_matches_queue_id ON matches(queue_id);

-- Participants table for quick queries
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    puuid VARCHAR(78) NOT NULL REFERENCES summoners(puuid) ON DELETE CASCADE,
    champion_id INTEGER NOT NULL,
    champion_name VARCHAR(50) NOT NULL,
    kills INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    win BOOLEAN DEFAULT FALSE,
    total_damage BIGINT DEFAULT 0,
    gold_earned INTEGER DEFAULT 0,
    cs_score INTEGER DEFAULT 0,
    vision_score INTEGER DEFAULT 0,
    kda DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(match_id, puuid)
);

CREATE INDEX idx_participants_puuid ON participants(puuid);
CREATE INDEX idx_participants_match_id ON participants(match_id);
CREATE INDEX idx_participants_champion_id ON participants(champion_id);
CREATE INDEX idx_participants_win ON participants(win);

-- Cache table (backup for Redis)
CREATE TABLE cache_entries (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cache_expires_at ON cache_entries(expires_at);

-- Function to clean expired cache entries
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

-- Create a view for match statistics
CREATE VIEW match_stats AS
SELECT 
    p.puuid,
    s.game_name,
    s.tag_line,
    COUNT(*) as total_games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END) as wins,
    ROUND(
        (SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as win_rate,
    ROUND(AVG(p.kills), 2) as avg_kills,
    ROUND(AVG(p.deaths), 2) as avg_deaths,
    ROUND(AVG(p.assists), 2) as avg_assists,
    ROUND(AVG(p.kda), 2) as avg_kda,
    ROUND(AVG(p.cs_score), 2) as avg_cs,
    ROUND(AVG(p.vision_score), 2) as avg_vision_score
FROM participants p
JOIN summoners s ON p.puuid = s.puuid
JOIN matches m ON p.match_id = m.match_id
WHERE m.game_creation > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days') * 1000
GROUP BY p.puuid, s.game_name, s.tag_line;