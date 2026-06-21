# League of Legends Match Tracker - Project Overview

## 📋 Project Description

A full-stack application for tracking League of Legends player statistics, match history, and live game data. The project consists of a Next.js frontend client and a high-performance Go backend API with PostgreSQL and Redis caching.

## 🏗️ Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Next.js Frontend  │ ◄─────► │   Go Backend API    │
│   (Port 3000)       │         │   (Port 8080)       │
│                     │         │   - Gin Framework   │
│   - React 19        │         │   - REST API        │
│   - TypeScript      │         │   - Rate Limiting   │
│   - Tailwind CSS    │         │   - CORS Enabled    │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
         ┌──────────────────┐   ┌──────────────────┐  ┌─────────────────┐
         │   PostgreSQL 15  │   │   Redis Cache    │  │   Riot Games    │
         │   (Port 5433)    │   │   (Port 6379)    │  │   API           │
         │                  │   │                  │  │                 │
         │   - Summoners    │   │   - Fast TTL     │  │   - Official    │
         │   - Matches      │   │   - Hot Data     │  │   - Rate Limited│
         │   - Participants │   │   - Session Mgmt │  │                 │
         └──────────────────┘   └──────────────────┘  └─────────────────┘
```

---

## 🎯 Tech Stack

### Frontend (Client)

#### Core Technologies
- **Next.js 15.5.3** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Utility-first CSS framework with PostCSS

#### Development Tools
- **ESLint 9** - Code linting with Next.js config
- **Turbopack** - Fast bundler (enabled in dev and build)
- **@types/node**, **@types/react**, **@types/react-dom** - TypeScript definitions

### Backend (Server)

#### Core Technologies
- **Go 1.21** - Programming language
- **Gin 1.9.1** - HTTP web framework
- **PostgreSQL 15** - Primary database
- **Redis 7** - Caching layer

#### Go Dependencies

**Main Dependencies:**
- `github.com/gin-gonic/gin` v1.9.1 - Web framework
- `github.com/gin-contrib/cors` v1.4.0 - CORS middleware
- `github.com/lib/pq` v1.10.9 - PostgreSQL driver
- `github.com/go-redis/redis/v8` v8.11.5 - Redis client
- `github.com/joho/godotenv` v1.4.0 - Environment variable management
- `github.com/go-playground/validator/v10` v10.16.0 - Request validation

**Supporting Libraries:**
- `github.com/bytedance/sonic` - High-performance JSON serialization
- `github.com/goccy/go-json` - JSON encoder/decoder
- Various indirect dependencies for routing, middleware, and utilities

### Infrastructure & DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PostgreSQL 15 Alpine** - Lightweight database image
- **Redis 7 Alpine** - Lightweight cache image
- **Make** - Build automation

---

## 🛣️ API Routes

### Frontend Routes (Next.js API Routes)

#### 1. `/api/summoner` (GET)
**Purpose:** Fetch summoner data and match history  
**Query Parameters:**
- `gameName` (required) - Player's game name
- `tagLine` (required) - Player's tag (e.g., NA1, KR1)
- `region` (optional, default: "na1") - Server region

**Response:** Summoner profile, stats, and last 10 matches

#### 2. `/api/live-game` (GET)
**Purpose:** Check if a player is currently in a live game  
**Query Parameters:**
- `gameName` (required) - Player's game name
- `tagLine` (required) - Player's tag
- `region` (optional, default: "na1") - Server region

**Response:** Live game data or 404 if not in game

### Backend Routes (Go/Gin API)

#### Health Check
- `GET /health` - Service health status

#### Summoner Routes (`/api/summoner`)
- `GET /api/summoner` - Get summoner by name and tag
  - Query params: `gameName`, `tagLine`, `region`
- `POST /api/summoner/search` - Search for summoner (JSON body)
  - Body: `{ "gameName": "", "tagLine": "", "region": "" }`
- `GET /api/summoner/:puuid/stats` - Get summoner statistics by PUUID

#### Future Routes (Commented in Code)
- `GET /api/matches/:matchId` - Get specific match details
- `GET /api/matches/recent/:puuid` - Get recent matches for player
- `GET /api/live/:puuid` - Get current live game by PUUID

---

## 🗄️ Database Schema

### Tables

#### 1. **summoners**
Stores player profile information
```sql
- puuid (PK, VARCHAR(78))
- game_name (VARCHAR(100))
- tag_line (VARCHAR(10))
- region (VARCHAR(10))
- summoner_level (INTEGER)
- profile_icon_id (INTEGER)
- last_updated (TIMESTAMP)
- created_at (TIMESTAMP)

Indexes:
- idx_summoners_name_tag_region (game_name, tag_line, region)
- idx_summoners_last_updated (last_updated)
```

#### 2. **matches**
Stores match data
```sql
- match_id (PK, VARCHAR(50))
- game_creation (BIGINT)
- game_duration (INTEGER)
- game_mode (VARCHAR(50))
- queue_id (INTEGER)
- region (VARCHAR(10))
- match_data (JSONB) - Full match details
- created_at (TIMESTAMP)
- last_updated (TIMESTAMP)

Indexes:
- idx_matches_game_creation (game_creation DESC)
- idx_matches_region (region)
- idx_matches_queue_id (queue_id)
```

#### 3. **participants**
Stores player performance in each match
```sql
- id (PK, SERIAL)
- match_id (FK → matches.match_id)
- puuid (FK → summoners.puuid)
- champion_id (INTEGER)
- champion_name (VARCHAR(50))
- kills, deaths, assists (INTEGER)
- win (BOOLEAN)
- total_damage (BIGINT)
- gold_earned (INTEGER)
- cs_score (INTEGER)
- vision_score (INTEGER)
- ... additional stats fields
```

---

## 🚀 Features

### Current Features
✅ Search summoner by name and tag  
✅ Display last 10 matches with detailed stats  
✅ Show KDA, damage dealt, champions played  
✅ Live game detection  
✅ Multi-layer caching (Redis + PostgreSQL)  
✅ Rate limit protection  
✅ Responsive UI with Tailwind CSS  
✅ Docker deployment ready  
✅ CORS-enabled API  

### Architecture Highlights
- **3-Tier Caching Strategy:**
  1. Redis (hot data, short TTL)
  2. PostgreSQL (persistent data)
  3. Riot API (fallback)
  
- **Raw SQL Performance:** Direct PostgreSQL queries without ORM overhead
- **Type Safety:** Full TypeScript coverage on frontend
- **Validation:** Request validation with go-playground/validator
- **Error Handling:** Comprehensive error handling and logging

---

## 📦 Services & Ports

| Service    | Port | Purpose                          |
|------------|------|----------------------------------|
| Frontend   | 3000 | Next.js development server       |
| Backend    | 8080 | Go API server                    |
| PostgreSQL | 5433 | Database (mapped from 5432)      |
| Redis      | 6379 | Cache server                     |

---

## 🔧 Project Structure

```
lol_setup/
├── client/                    # Next.js Frontend
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── api/          # API route handlers
│   │   │   │   ├── live-game/   # Live game endpoint
│   │   │   │   └── summoner/    # Summoner endpoint
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/       # React components
│   │   │   ├── ErrorDisplay.tsx
│   │   │   ├── LiveGame.tsx
│   │   │   ├── MatchHistory.tsx
│   │   │   └── SearchComponent.tsx
│   │   ├── data/            # Static data
│   │   │   └── champions.ts
│   │   ├── services/        # API services
│   │   │   └── riot-api.ts
│   │   └── types/           # TypeScript types
│   │       └── riot-api.ts
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── tailwind.config.js
│
└── server/                    # Go Backend
    ├── cmd/
    │   └── server/
    │       └── main.go       # Application entry point
    ├── internal/
    │   ├── cache/           # Redis caching
    │   │   └── redis.go
    │   ├── config/          # Configuration
    │   │   └── config.go
    │   ├── database/        # PostgreSQL setup
    │   │   └── database.go
    │   ├── handlers/        # HTTP handlers
    │   │   └── summoner.go
    │   ├── middleware/      # Middleware (CORS, logging)
    │   │   └── middleware.go
    │   ├── models/          # Data models
    │   │   └── models.go
    │   ├── repository/      # Database layer
    │   │   ├── match.go
    │   │   └── summoner.go
    │   └── services/        # Business logic
    │       ├── riot_api.go
    │       └── summoner.go
    ├── migrations/          # SQL migrations
    │   └── 001_init.sql
    ├── docker-compose.yml
    ├── Dockerfile
    ├── Makefile
    ├── go.mod
    └── setup.sh
```

---

## 🔑 Environment Variables

### Client (.env.local)
```env
RIOT_API_KEY=your_riot_api_key_here
NEXT_PUBLIC_DEFAULT_REGION=na1
```

### Server (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres123
DB_NAME=lol_tracker
DB_SSL_MODE=disable

# Redis
REDIS_URL=localhost:6379
REDIS_PASSWORD=

# API
PORT=8080
GIN_MODE=debug

# Riot API
RIOT_API_KEY=your_riot_api_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Cache TTL (seconds)
SUMMONER_CACHE_TTL=300
MATCH_CACHE_TTL=900
LIVE_GAME_CACHE_TTL=60
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Navigate to server directory
cd server

# Start all services
make docker-run

# Navigate to client directory
cd ../client

# Install dependencies and run
npm install
npm run dev
```

### Option 2: Local Development
```bash
# Terminal 1 - Start database services
cd server
make db-up

# Terminal 2 - Start Go backend
cd server
make run

# Terminal 3 - Start Next.js frontend
cd client
npm install
npm run dev
```

Access the application at: **http://localhost:3000**

---

## 📝 Additional Documentation

- [Client README](client/README.md) - Frontend setup and usage
- [Server README](server/README.md) - Backend API documentation
- [Client Setup Guide](client/SETUP_GUIDE.md) - Detailed frontend setup
- [Debug Guide](client/DEBUG_GUIDE.md) - Troubleshooting tips
- [Riot API Docs](client/RIOT_API_DOCS.md) - Riot API reference

---

## 🔒 Rate Limits

**Riot API Personal Key:**
- 100 requests every 2 minutes
- Consider production key for higher limits

**Caching Strategy Helps:**
- Summoner data: 5 minutes
- Match data: 15 minutes
- Live game: 1 minute

---

## 🛠️ Build Commands

### Client
```bash
npm run dev      # Development with Turbopack
npm run build    # Production build
npm run start    # Production server
npm run lint     # Run ESLint
```

### Server
```bash
make build       # Build Go binary
make run         # Run locally
make docker-run  # Run with Docker
make db-up       # Start database services
make db-down     # Stop database services
make deps        # Install dependencies
```

---

## 📄 License

This project is for educational and personal use. Riot Games API usage must comply with their [Terms of Service](https://developer.riotgames.com/policies/general).

---

**Last Updated:** March 26, 2026
