# ──────────────────────────────────────────────────────────────────────────────
# LoL Match Tracker — Makefile
# ──────────────────────────────────────────────────────────────────────────────
# Quick reference:
#   make dev-local   → DB in Docker + Go server locally (fastest iteration)
#   make dev-docker  → Everything in Docker (tests the full stack)
#   make debug-docker-up   → Start Delve in Docker for VS Code attach
#   make migrate-up  → Apply all pending migrations (requires migrate CLI)
#   make test        → Run all Go tests
# ──────────────────────────────────────────────────────────────────────────────

# Go
GOCMD   = go
GOBUILD = $(GOCMD) build
GOTEST  = $(GOCMD) test
GOMOD   = $(GOCMD) mod
BINARY  = lol-match-tracker

# Docker
DOCKER_IMAGE = lol-match-tracker-api
DOCKER_TAG   = latest
DEBUG_COMPOSE_FILES = -f docker-compose.yml -f docker-compose.debug.yml

# golang-migrate
# Local dev DB URL — override with DB_URL=... if your creds differ
DB_URL ?= postgres://postgres:postgres123@localhost:5432/lol_tracker?sslmode=disable

# ── Build ──────────────────────────────────────────────────────────────────────
all: test build

build:
	$(GOBUILD) -o $(BINARY) -v ./cmd/server

test:
	$(GOTEST) -v ./...

clean:
	rm -f $(BINARY) $(BINARY)_unix

deps:
	$(GOMOD) download
	$(GOMOD) tidy

fmt:
	go fmt ./...

vet:
	go vet ./...

# ── Local development ──────────────────────────────────────────────────────────
# dev-local: Postgres + Redis run in Docker; the Go binary runs on your machine.
#   - Fastest option: no Docker rebuild on every Go change.
#   - Requires: Docker + air (`make install-air`)
#   Steps: start DBs, apply schema, then hot-reload the Go server.
dev-local: db-up migrate-up
	air

# dev-docker: The full stack (DB + Redis + Go API) runs inside Docker Compose.
#   - Use this to test that the container image builds and works end-to-end.
#   - Slower iteration because Docker must rebuild the image on Go changes.
dev-docker:
	docker compose up --build

debug-docker-up:
	docker compose $(DEBUG_COMPOSE_FILES) up --build -d

debug-docker-down:
	docker compose $(DEBUG_COMPOSE_FILES) down

install-air:
	go install github.com/cosmtrek/air@latest

# ── Docker ────────────────────────────────────────────────────────────────────
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker-stop:
	docker compose down

docker-clean:
	docker compose down -v
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) 2>/dev/null || true

# ── Database services ──────────────────────────────────────────────────────────
# db-up: starts only Postgres + Redis (no API container).
db-up:
	docker compose up postgres redis -d

db-down:
	docker compose stop postgres redis

# ── Migrations (golang-migrate) ────────────────────────────────────────────────
# How it works:
#   1. golang-migrate reads ./migrations/*.up.sql / *.down.sql files.
#   2. It creates a `schema_migrations` table in Postgres to track which
#      migrations have been applied (by version number).
#   3. `migrate up`   → runs all unapplied *.up.sql files in version order.
#   4. `migrate down` → rolls back the last applied migration via *.down.sql.
#   5. IF NOT EXISTS in the SQL makes re-runs idempotent.
#
# Install the CLI once with:  make migrate-install

MIGRATE = migrate

migrate-install:
	go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

migrate-up:
	$(MIGRATE) -path ./migrations -database "$(DB_URL)" up

migrate-down:
	$(MIGRATE) -path ./migrations -database "$(DB_URL)" down 1

migrate-status:
	$(MIGRATE) -path ./migrations -database "$(DB_URL)" version

migrate-drop:
	$(MIGRATE) -path ./migrations -database "$(DB_URL)" drop -f

# ── Cross-compilation ──────────────────────────────────────────────────────────
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY)_unix -v ./cmd/server

.PHONY: all build test clean deps fmt vet \
	dev-local dev-docker debug-docker-up debug-docker-down install-air \
        docker-build docker-stop docker-clean \
        db-up db-down \
        migrate-install migrate-up migrate-down migrate-status migrate-drop \
        build-linux
