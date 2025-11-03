# League of Legends Match History Tracker

A Next.js application that fetches and displays the last 10 matches for any League of Legends player using the Riot Games API.

## Features

- Search by summoner name and tag (e.g., "Hide on bush#KR1")
- Display last 10 matches with detailed statistics
- Show damage dealt, teammates, KDA, and more
- Real-time data fetching from Riot API
- Responsive UI built with Tailwind CSS

## Setup Instructions

### 1. Get a Riot API Key

1. Visit [Riot Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot account
3. Create a new app to get your API key

### 2. Environment Variables

Create a `.env.local` file in the root directory and add your Riot API key:

```env
RIOT_API_KEY=your_riot_api_key_here
NEXT_PUBLIC_DEFAULT_REGION=na1
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v4** for styling
- **Riot Games API** for League of Legends data

## API Endpoints Used

- Account API: Get summoner info by name and tag
- Summoner API: Get summoner details
- Match API: Get match history and match details

## Rate Limits

Personal API keys are limited to 100 requests every 2 minutes. Production keys have higher limits.
