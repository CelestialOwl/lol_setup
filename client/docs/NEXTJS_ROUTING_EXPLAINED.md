# How Next.js Routing & Fetch Works in This Project

## The Confusion

In a plain React app, `fetch('/api/summoner')` would fail — there's no server listening at that path. In Next.js, **the framework itself acts as a server**, and you can define API endpoints right inside your project.

---

## File-System Based Routing

Next.js maps **file paths → URL paths** automatically. No manual router config needed.

| File Path | URL |
|---|---|
| `src/app/page.tsx` | `/` (the homepage) |
| `src/app/api/summoner/route.ts` | `/api/summoner` |
| `src/app/api/live-game/route.ts` | `/api/live-game` |

The magic rule: any file named **`route.ts`** inside `app/api/...` becomes an HTTP endpoint. Any file named **`page.tsx`** becomes a UI page.

---

## The Request Flow in This Project

Here's what happens when you search for a player:

```
Browser (page.tsx)
    │
    │  fetch('/api/summoner?gameName=Faker&tagLine=T1&region=kr')
    │  ← same-origin request, no token needed
    ▼
Next.js Server (api/summoner/route.ts)
    │
    │  reads RIOT_API_KEY from server environment (never sent to browser)
    │  calls riotApiService.getSummonerData(...)
    ▼
services/riot-api.ts  →  makeRequest(url)
    │
    │  fetch('https://kr.api.riotgames.com/...', {
    │    headers: { 'X-Riot-Token': RIOT_API_KEY }
    │  })
    ▼
Riot Games API (external)
```

### Step 1 — `page.tsx` (the browser side)

```tsx
// Line 29-34: build query params
const params = new URLSearchParams({
  gameName: searchData.gameName,
  tagLine: searchData.tagLine,
  region: searchData.region,
});

// Line 36: fetch your OWN Next.js server, not Riot directly
const response = await fetch(`/api/summoner?${params}`);
```

`/api/summoner` is a **relative URL** — it hits the Next.js server running on the same host. No API key here; this is safe to do in the browser.

### Step 2 — `api/summoner/route.ts` (the server side)

```ts
// This function runs ON THE SERVER, not in the browser
export async function GET(request: NextRequest) {
  const gameName = searchParams.get('gameName');
  // ...
  const summonerData = await riotApiService.getSummonerData(gameName, tagLine, region);
  return NextResponse.json(summonerData);
}
```

Next.js automatically calls this `GET` function when a GET request arrives at `/api/summoner`. Because this code runs server-side, it can safely read `process.env.RIOT_API_KEY`.

### Step 3 — `services/riot-api.ts` (still server-side)

```ts
const RIOT_API_KEY = process.env.RIOT_API_KEY; // ✅ only available server-side

private async makeRequest<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'X-Riot-Token': RIOT_API_KEY, // added here, before hitting Riot
    },
  });
}
```

---

## Why This Pattern Exists (Security)

If `page.tsx` called Riot directly, the API key would be visible in the browser's Network tab — anyone could steal it. The Next.js API route acts as a **proxy**:

```
Browser  ──(no token)──▶  Your Next.js API  ──(token added)──▶  Riot API
```

The key never leaves your server.

---

## The `"use client"` Directive

At the top of `page.tsx`:
```tsx
"use client";
```

This tells Next.js that `page.tsx` runs in the **browser** (it uses `useState`, event handlers, etc.). Files without this directive — like `route.ts` and `riot-api.ts` — run **only on the server**.

---

## Summary

| File | Runs in | Purpose |
|---|---|---|
| `page.tsx` | Browser | UI, triggers `fetch` to your own API |
| `api/summoner/route.ts` | Server | Receives request, calls Riot service |
| `api/live-game/route.ts` | Server | Same, for live game data |
| `services/riot-api.ts` | Server | Adds API token, calls Riot's actual API |
