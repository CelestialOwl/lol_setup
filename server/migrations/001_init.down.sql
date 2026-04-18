-- Migration: 001_init (DOWN)
-- Drops everything created by 001_init.up.sql in reverse dependency order.

DROP VIEW     IF EXISTS match_stats;
DROP FUNCTION IF EXISTS clean_expired_cache();
DROP TABLE    IF EXISTS participants;
DROP TABLE    IF EXISTS cache_entries;
DROP TABLE    IF EXISTS matches;
DROP TABLE    IF EXISTS summoners;
DROP EXTENSION IF EXISTS "uuid-ossp";
