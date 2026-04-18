# Database Design & Query Performance

---

## Match Data Storage Strategy

### The Problem

The Riot API returns ~200 fields per participant per match. The naive approach — one column per
stat — produces a table with 200+ columns, a migration every time Riot adds a field, and complex
queries for even simple lookups.

### Decision: JSONB blob + thin participants table

The current schema uses two complementary structures:

```
matches.match_data   JSONB    ← full Riot API response, never changes
participants         table    ← only the columns you actually filter/aggregate on
```

**`matches.match_data` (JSONB)**

- Stores the entire Riot API JSON as-is.
- Zero schema changes when Riot adds or renames a field.
- Frontend can render any stat without a new DB migration.
- PostgreSQL's JSONB is binary-indexed — field extraction is fast.
- GIN index can be added later for full-text or key searches if needed.

**`participants` table (thin)**

Only the columns that are queried in `WHERE`, `GROUP BY`, or `ORDER BY` clauses get their own
column. Right now that is: `puuid`, `match_id`, `champion_id`, `champion_name`, `kills`,
`deaths`, `assists`, `win`, `total_damage`, `gold_earned`, `kda`.

This means:
- `GetSummonerStats` → fast aggregate query over indexed columns
- `GetRecentMatchesForPUUID` → index-covered JOIN without touching JSONB
- All other stats → read from `match_data` JSONB on the frontend

### Should You Use MongoDB Instead?

MongoDB is often suggested for "document" data like this, but Postgres JSONB gives you the same
flexibility plus:

- ACID transactions across summoners + matches + participants in one write
- Foreign keys (`participants.match_id → matches.match_id`) with cascade delete
- Standard SQL for aggregations (win rate by champion, average KDA, etc.)
- One fewer infrastructure dependency

**Recommendation:** stay with Postgres + JSONB. Add MongoDB only if you need horizontal
write scaling across tens of millions of documents — this project is nowhere near that point.

---

## EXPLAIN ANALYZE

### What It Is

`EXPLAIN ANALYZE` is a Postgres command that executes a query and returns its execution plan
alongside real timing and row-count data. It answers: "why is this query slow?"

```sql
EXPLAIN ANALYZE
SELECT DISTINCT m.match_id, m.game_creation, m.game_duration, m.game_mode,
       m.queue_id, m.region, m.match_data
FROM matches m
JOIN participants p ON m.match_id = p.match_id
WHERE p.puuid = 'some-puuid-here'
ORDER BY m.game_creation DESC
LIMIT 10;
```

### How to Read the Output

```
Limit  (cost=0.00..1.23 rows=10 width=...)  (actual time=0.042..0.051 rows=10 loops=1)
  ->  Sort  (cost=... rows=N ...)  (actual time=... rows=10 ...)
        Sort Key: m.game_creation DESC
        ->  Hash Join  (cost=... rows=N ...)  (actual time=... rows=N ...)
              Hash Cond: (m.match_id = p.match_id)
              ->  Seq Scan on matches m  (actual time=... rows=N ...)
              ->  Hash  (actual time=... rows=N ...)
                    ->  Index Scan using idx_participants_puuid on participants p
                          Index Cond: (puuid = 'some-puuid-here')
```

Key fields to look at:

| Field | What it means |
|---|---|
| `cost=0.00..1.23` | Estimated startup cost .. total cost (arbitrary planner units) |
| `actual time=0.04..0.05` | Real wall-clock time in milliseconds (startup..total) |
| `rows=10` | Actual rows returned by that node |
| `loops=1` | How many times this node ran (important inside nested loops) |
| `Seq Scan` | Full table scan — bad on large tables, fine on tiny ones |
| `Index Scan` | Used an index — usually what you want |
| `Index Only Scan` | Read from the index alone, never touched the heap — best case |
| `Hash Join` | Built a hash table to join — good for larger sets |
| `Nested Loop` | Per-row lookup — good when the inner side is small and indexed |

### Indexes That Cover This Query

The migration already creates the indexes this query needs:

```sql
-- participants lookup by puuid (the WHERE clause)
CREATE INDEX idx_participants_puuid    ON participants(puuid);

-- matches join key
CREATE INDEX idx_participants_match_id ON participants(match_id);

-- ORDER BY game_creation DESC
CREATE INDEX idx_matches_game_creation ON matches(game_creation DESC);
```

With these in place you should see `Index Scan using idx_participants_puuid` in the plan rather
than a `Seq Scan on participants`. If you still see a `Seq Scan` after inserting a few thousand
rows, the planner might decide the table is too small to justify an index scan — that is normal
and will flip automatically as the table grows.

### How to Run It Yourself

1. Start the stack: `make dev-local`
2. Connect to Postgres:
   ```bash
   docker exec -it lol-match-tracker-postgres-1 psql -U postgres -d lol_tracker
   ```
3. Paste the query above with a real PUUID from your `participants` table.
4. Look for `Seq Scan` nodes on large tables — those are candidates for new indexes.

### When to Add a New Index

Add an index when **all three** are true:
- The column appears in `WHERE`, `JOIN ON`, or `ORDER BY`
- The table has more than ~10 000 rows
- `EXPLAIN ANALYZE` shows `Seq Scan` with high `actual time`

Indexes have a write-time cost (every `INSERT`/`UPDATE` must update them), so don't add them
speculatively — let `EXPLAIN ANALYZE` guide you.
