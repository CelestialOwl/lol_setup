# Migrations Guide

This project uses [golang-migrate](https://github.com/golang-migrate/migrate) for versioned,
reversible database schema changes.

---

## How It Works

golang-migrate maintains a `schema_migrations` table in Postgres that tracks which migration
versions have been applied. Each migration is a pair of SQL files:

```
migrations/
  001_init.up.sql      ← forward migration (creates tables, indexes, etc.)
  001_init.down.sql    ← reverse migration (drops everything added by .up)
  002_add_index.up.sql
  002_add_index.down.sql
  ...
```

- **Version number** is the numeric prefix (`001`, `002`, …). Files are applied in ascending order.
- `migrate up` runs every `.up.sql` whose version is higher than the current version in the DB.
- `migrate down 1` runs the `.down.sql` for the current version, then decrements the version.
- `IF NOT EXISTS` guards in the SQL make re-running `.up.sql` idempotent (safe to run twice).

---

## Quick-Start (local dev)

### 1. Install the CLI (once)

```bash
make migrate-install
# installs `migrate` binary to $GOPATH/bin
```

Make sure `$GOPATH/bin` (usually `~/go/bin`) is on your `$PATH`:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

### 2. Start Postgres + Redis

```bash
make db-up
```

### 3. Apply all pending migrations

```bash
make migrate-up
# runs: migrate -path ./migrations -database "postgres://..." up
```

### 4. Start the Go server with hot-reload

```bash
make dev-local   # = db-up + migrate-up + air
```

---

## Makefile Reference

| Command | What it does |
|---|---|
| `make migrate-install` | Install the `migrate` CLI via `go install` |
| `make migrate-up` | Apply all unapplied `.up.sql` migrations |
| `make migrate-down` | Roll back the **last** migration (runs its `.down.sql`) |
| `make migrate-status` | Print the current migration version number |
| `make migrate-drop` | **⚠ Drop the entire DB schema** (destructive, dev only) |

Override the default DB URL:

```bash
DB_URL="postgres://user:pass@host:5432/mydb?sslmode=disable" make migrate-up
```

---

## Adding a New Migration

1. Create two files with the next version number:

```bash
touch migrations/002_add_index.up.sql
touch migrations/002_add_index.down.sql
```

2. Write the forward change in `.up.sql`:

```sql
-- 002_add_index.up.sql
CREATE INDEX IF NOT EXISTS idx_summoners_region ON summoners(region);
```

3. Write the exact reverse in `.down.sql`:

```sql
-- 002_add_index.down.sql
DROP INDEX IF EXISTS idx_summoners_region;
```

4. Apply it:

```bash
make migrate-up
```

> **Rule:** The `.down.sql` must undo exactly what the `.up.sql` did — no more, no less.
> This makes rollback safe without affecting older migrations.

---

## Docker Compose Behaviour

When the stack is started with `make dev-docker` (i.e. `docker compose up`), Postgres runs
the files in `./migrations/` that are mounted at `/docker-entrypoint-initdb.d/` **only on the
first container start** (when the data volume is empty).

For subsequent starts or schema changes, always use `make migrate-up` — the Docker entrypoint
does **not** run again on an already-initialised volume.

---

## Inspecting the Migration State

Connect directly to Postgres and check the tracking table:

```sql
SELECT * FROM schema_migrations;
-- version | dirty
-- --------+-------
--     1   | false
```

- `version`: the last migration number applied.
- `dirty`: `true` means a migration failed mid-way. Fix the SQL, then run
  `migrate force <version>` to reset the dirty flag before re-running.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `dirty database version` error | A migration failed partway through | Fix the SQL, then `migrate -path ./migrations -database "..." force <version>` |
| `no change` on `migrate up` | All migrations already applied | Normal — nothing to do |
| Table already exists error | Re-running without `IF NOT EXISTS` | Add `IF NOT EXISTS` to your SQL |
| `migrate: command not found` | CLI not installed or not on PATH | `make migrate-install` + check `$PATH` |
