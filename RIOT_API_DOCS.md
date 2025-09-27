# Riot API Endpoints for League of Legends

## Required API Endpoints

### 1. Get Account by Riot ID (Name + Tag)

```
GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
```

- **Purpose**: Get account info (puuid) by summoner name and tag
- **Example**: `/riot/account/v1/accounts/by-riot-id/Hide on bush/KR1`
- **Response**: Contains `puuid` which is needed for other API calls

### 2. Get Summoner by PUUID

```
GET /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}
```

- **Purpose**: Get summoner details like level, profile icon
- **Response**: Contains summoner info and `id` for further calls

### 3. Get Match History

```
GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=10
```

- **Purpose**: Get list of match IDs for the last 10 matches
- **Parameters**: start=0, count=10
- **Response**: Array of match IDs

### 4. Get Match Details

```
GET /lol/match/v5/matches/{matchId}
```

- **Purpose**: Get detailed match information
- **Response**: Full match data including participants, stats, timeline

### 5. Get League Entries by PUUID

```
GET /lol/league/v4/entries/by-puuid/{encryptedPUUID}
```

- **Purpose**: Get league entries for a summoner by their PUUID
- **Response**: Array of league entries including rank, tier, LP

### 6. Get Current Game (Spectator API)

```
GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}
```

- **Purpose**: Get information about a player's current live game
- **Response**: Current game data including participants, bans, game duration
- **Note**: Returns 404 if player is not in an active game

## Regional Routing

### Account API (Americas, Asia, Europe)

- Americas: `https://americas.api.riotgames.com`
- Asia: `https://asia.api.riotgames.com`
- Europe: `https://europe.api.riotgames.com`

### Platform APIs (Specific servers)

- NA1: `https://na1.api.riotgames.com`
- EUW1: `https://euw1.api.riotgames.com`
- KR: `https://kr.api.riotgames.com`
- ME1: `https://me1.api.riotgames.com`
- And more...

## Required Headers

```
X-Riot-Token: YOUR_API_KEY
```

## Data We'll Display

- Summoner name and level
- Match results (Win/Loss)
- Champion played
- KDA (Kills/Deaths/Assists)
- Damage dealt
- Teammates names
- Game duration
- Game mode

## Rate Limits

- Personal API Key: 100 requests every 2 minutes
- Production API Key: Higher limits available
