# League of Legends Match Tracker - Backend API

A high-performance Go backend API for tracking League of Legends summoner data, match history, and live games with PostgreSQL and Redis caching.

## 🚀 Features

- **Fast Data Retrieval**: Multi-layer caching with Redis and PostgreSQL
- **Rate Limit Protection**: Efficient caching reduces Riot API calls
- **RESTful API**: Clean endpoints for frontend integration
- **Raw SQL**: High-performance database queries without ORM overhead
- **Docker Support**: Easy deployment with Docker Compose
- **CORS Enabled**: Ready for frontend integration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│   Go API        │───▶│   PostgreSQL    │
│   (Next.js)     │    │   (Gin)         │    │   (Persistent)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Redis Cache   │───▶│   Riot API      │
                       │   (Fast TTL)    │    │   (Rate Limited)│
                       └─────────────────┘    └─────────────────┘
```

## 📦 Tech Stack

- **Language**: Go 1.21
- **Framework**: Gin (HTTP router)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start

### Prerequisites

- Go 1.21+
- Docker & Docker Compose
- Riot API Key

### 1. Clone and Setup

```bash
cd server
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file:

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

### 3. Run with Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
make docker-run

# Or individually
make db-up        # Start database services only
make run          # Run API locally
```

### 4. Run Locally

```bash
# Install dependencies
make deps

# Start database services
make db-up

# Run the API
make run
```

## 📚 API Endpoints

### Base URL: `http://localhost:8080`

### Summoner Endpoints

#### Get Summoner Data
```http
GET /api/summoner?gameName=Faker&tagLine=T1&region=kr
```

#### Search Summoner (POST)
```http
POST /api/summoner/search
Content-Type: application/json

{
  "gameName": "Faker",
  "tagLine": "T1",
  "region": "kr"
}
```

#### Get Summoner Statistics
```http
GET /api/summoner/{puuid}/stats
```

### Health Check
```http
GET /health
```

## 🗄️ Database Schema

### Summoners Table
```sql
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
```

### Matches Table
```sql
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
```

### Participants Table
```sql
CREATE TABLE participants (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL REFERENCES matches(match_id),
    puuid VARCHAR(78) NOT NULL REFERENCES summoners(puuid),
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
```

## 🔄 Caching Strategy

### 3-Layer Cache System:

1. **Redis Cache** (Fast, Short TTL)
   - Summoner data: 5 minutes
   - Match data: 15 minutes
   - Live games: 1 minute

2. **PostgreSQL** (Persistent, Medium TTL)
   - Recent summoner data: Check last 5 minutes
   - Historical match data: Permanent storage

3. **Riot API** (Fallback)
   - Only called when cache misses
   - Rate limit protected

## 🛠️ Development

### Make Commands

```bash
make build          # Build the binary
make run            # Build and run
make test           # Run tests
make fmt            # Format code
make vet            # Run go vet
make deps           # Download dependencies

# Docker commands
make docker-build   # Build Docker image
make docker-run     # Run with Docker Compose
make docker-stop    # Stop containers
make docker-clean   # Clean up containers and images

# Database commands
make db-up          # Start PostgreSQL and Redis
make db-down        # Stop database services
make db-migrate     # Run database migrations
```

### Hot Reload Development

```bash
# Install air for hot reload
make install-air

# Run with hot reload
make dev
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | PostgreSQL user | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres123` |
| `DB_NAME` | PostgreSQL database | `lol_tracker` |
| `REDIS_URL` | Redis connection URL | `localhost:6379` |
| `PORT` | API server port | `8080` |
| `RIOT_API_KEY` | Your Riot API key | **Required** |
| `SUMMONER_CACHE_TTL` | Summoner cache TTL (seconds) | `300` |
| `MATCH_CACHE_TTL` | Match cache TTL (seconds) | `900` |

## 📈 Performance Optimizations

### Database Optimizations:
- **Bulk Inserts**: Efficient batch operations for matches and participants
- **Strategic Indexes**: Optimized for common query patterns
- **Connection Pooling**: Configurable connection limits
- **Query Logging**: Monitor query performance

### Caching Optimizations:
- **Multi-layer Cache**: Redis + PostgreSQL + Riot API
- **Smart TTL**: Different cache durations based on data type
- **Cache-aside Pattern**: Fallback strategy for cache misses

### API Optimizations:
- **JSON Streaming**: Efficient response handling
- **CORS Optimization**: Minimal preflight requests
- **Error Handling**: Graceful degradation

## 🚀 Deployment

### Production Docker

```bash
# Build production image
docker build -t lol-match-tracker-api:prod .

# Run production setup
GIN_MODE=release docker-compose up -d
```

### Environment-specific Configs

- **Development**: Debug logging, local database
- **Production**: Error-only logging, managed database
- **Testing**: In-memory database, mocked APIs

## 🧪 Testing

```bash
# Run all tests
make test

# Run with coverage
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

## � Observability & Monitoring

The application includes comprehensive observability with distributed tracing, metrics, and monitoring dashboards.

### Services Overview

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Jaeger UI (Fixed)** | 8686 | http://localhost:8686 | **Use this** - Distributed tracing with CSS fixes |
| Jaeger UI (Original) | 16686 | http://localhost:16686 | Original UI (has contrast issues) |
| Prometheus | 9090 | http://localhost:9090 | Metrics collection |
| Grafana | 3030 | http://localhost:3030 | Monitoring dashboards |

### Jaeger Distributed Tracing

**⚠️ Use Port 8686 for Better UI Experience**

The Jaeger UI at port **8686** includes CSS fixes for better readability (dark text on light backgrounds). The original UI at port 16686 has contrast issues with white text on white backgrounds.

**Features:**
- Trace requests across services
- Identify performance bottlenecks
- Debug slow database queries
- Monitor Redis cache hits/misses
- Track external Riot API calls

**Quick Start:**
1. Open http://localhost:8686
2. Select service: `lol-match-tracker-api`
3. Click "Find Traces"
4. View trace details and span timings

### Prometheus Metrics

Access metrics at http://localhost:9090

**Available Metrics:**
- HTTP request durations
- Request counts by endpoint
- Cache hit/miss rates
- Database query performance
- Redis operation latencies

### Grafana Dashboards

Access dashboards at http://localhost:3030

**Default Credentials:**
- Username: `admin`
- Password: `admin`

**Pre-configured Dashboard:**
- Service health overview
- Request rate and latency
- Cache performance
- Database metrics
- Error rates

## �📝 API Response Examples

### Summoner Data Response
```json
{
  "account": {
    "puuid": "...",
    "gameName": "Faker",
    "tagLine": "T1"
  },
  "summoner": {
    "id": "...",
    "summonerLevel": 500,
    "profileIconId": 4568
  },
  "matches": [...],
  "liveGame": null
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

## 🔗 Related

- [Frontend Repository](../client) - Next.js frontend
- [Riot API Documentation](https://developer.riotgames.com/)
- [Go Gin Documentation](https://gin-gonic.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)