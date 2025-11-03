# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
BINARY_NAME=lol-match-tracker
BINARY_UNIX=$(BINARY_NAME)_unix

# Docker parameters
DOCKER_IMAGE=lol-match-tracker-api
DOCKER_TAG=latest

all: test build

build:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server

test:
	$(GOTEST) -v ./...

clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_UNIX)

run:
	$(GOBUILD) -o $(BINARY_NAME) -v ./cmd/server
	./$(BINARY_NAME)

deps:
	$(GOMOD) download
	$(GOMOD) tidy

# Cross compilation
build-linux:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 $(GOBUILD) -o $(BINARY_UNIX) -v ./cmd/server

# Docker commands
docker-build:
	docker build -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker-run:
	docker-compose up --build

docker-stop:
	docker-compose down

docker-clean:
	docker-compose down -v
	docker rmi $(DOCKER_IMAGE):$(DOCKER_TAG) || true

# Database commands
db-up:
	docker-compose up postgres redis -d

db-down:
	docker-compose stop postgres redis

db-migrate:
	docker-compose exec postgres psql -U postgres -d lol_tracker -f /docker-entrypoint-initdb.d/001_init.sql

# Development commands
dev:
	air

install-air:
	go install github.com/cosmtrek/air@latest

# Format and lint
fmt:
	go fmt ./...

vet:
	go vet ./...

# Generate go.sum
mod-verify:
	$(GOMOD) verify

.PHONY: all build test clean run deps build-linux docker-build docker-run docker-stop docker-clean db-up db-down db-migrate dev install-air fmt vet mod-verify