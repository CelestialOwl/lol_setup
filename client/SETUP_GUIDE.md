# 🎮 League of Legends Match History Tracker - Setup Guide

## ✅ What's Been Built

Your League of Legends match history tracker is now complete! Here's what we've implemented:

### 🚀 Features

- **Search by Summoner Name & Tag**: Enter any player's name and tag (e.g., "Hide on bush#KR1")
- **Real-time Data**: Fetches live data from Riot Games API
- **Match History**: Displays the last 10 matches with detailed statistics
- **Live Game Tracking**: Shows if a player is currently in a game with team compositions
- **Comprehensive Stats**: Shows KDA, damage dealt, gold earned, teammates, and more
- **Win/Loss Tracking**: Visual indicators and summary statistics
- **Responsive Design**: Works perfectly on desktop and mobile
- **Error Handling**: Proper error messages and loading states

### 🛠 Tech Stack

- **Next.js 15** with App Router and TypeScript
- **Tailwind CSS v4** for modern, responsive styling
- **Riot Games API** integration
- **Server-side API routes** for secure API key handling

## 🔧 Setup Instructions

### 1. Get Your Riot API Key

1. Visit the [Riot Developer Portal](https://developer.riotgames.com/)
2. Sign in with your Riot Games account
3. Create a new personal API key (this gives you 100 requests per 2 minutes)
4. Copy your API key

### 2. Configure Environment Variables

Open the `.env.local` file in your project root and replace the placeholder:

```env
RIOT_API_KEY=your_actual_riot_api_key_here
NEXT_PUBLIC_DEFAULT_REGION=na1
```

### 3. Install Dependencies & Run

```bash
# Install all dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## 🎯 How to Use

1. **Enter Summoner Info**: Type the summoner name and tag line
2. **Select Region**: Choose the correct server region
3. **Search**: Click "Search Matches" to fetch data
4. **View Results**: Browse through match history with detailed stats

### Example Searches

- Name: "Hide on bush", Tag: "KR1", Region: Korea
- Name: "Doublelift", Tag: "NA1", Region: North America
- Name: "Caps", Tag: "EUW", Region: Europe West
- Name: "PlayerName", Tag: "ME1", Region: Middle East

## 📁 Project Structure

```
src/
├── app/
│   ├── api/summoner/route.ts    # API endpoint for fetching data
│   ├── globals.css              # Global styles and theming
│   ├── layout.tsx               # App layout
│   └── page.tsx                 # Main homepage component
├── components/
│   ├── SearchComponent.tsx      # Search form component
│   ├── MatchHistory.tsx         # Match history display
│   └── ErrorDisplay.tsx         # Error handling & loading states
├── services/
│   └── riot-api.ts             # Riot API service functions
└── types/
    └── riot-api.ts             # TypeScript interfaces
```

## 🔍 API Endpoints Used

- **Account API**: Get summoner info by name and tag
- **Summoner API**: Get summoner level and details
- **Match API**: Get match history and detailed match data

## 🎨 Features Implemented

### Search Component

- Input validation
- Region selection
- Loading states
- Form submission handling

### Match History Display

- Last 10 matches

### **Stats Displayed:**

- ✅ Win/Loss results with visual indicators
- ✅ Champion played in each match
- ✅ KDA (Kills/Deaths/Assists)
- ✅ Damage dealt to champions
- ✅ Gold earned
- ✅ Teammates names with their current ranks
- ✅ Game duration and date
- ✅ Match summary with win rate

### Error Handling

- API rate limit messages
- Summoner not found errors
- Network error handling
- Retry functionality

## 🚀 Next Steps (Optional Enhancements)

You can further enhance this app by adding:

1. **Champion Icons**: Display champion images
2. **Items Display**: Show items purchased in matches
3. **Rank Information**: Add current rank display
4. **Match Timeline**: Detailed match progression
5. **Comparison Tool**: Compare multiple summoners
6. **Favorites**: Save frequently searched summoners

## 🐛 Troubleshooting

**API Key Issues**: Make sure your `.env.local` file is in the project root and the API key is valid.

**Rate Limits**: Personal API keys have a limit of 100 requests per 2 minutes.

**Region Mismatch**: Ensure the selected region matches where the summoner actually plays.

**CORS Errors**: The API calls go through Next.js API routes to avoid CORS issues.

## 📜 License & Credits

Built with ❤️ using Riot Games API. This project is for educational purposes.

Remember: Riot Games API keys expire, so you'll need to refresh them periodically for continued use.

Happy Gaming! 🎮
