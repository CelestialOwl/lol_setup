# Next.js 15 Packaging & URL-to-Filesystem Cheatsheet

This guide maps request paths to their actual filesystem locations in the Next.js build output for this project.

## Build Output Structure

```
.next/                          # Main Next.js build output
├── static/
│   ├── chunks/                 # Client-side JavaScript bundles
│   │   ├── app/               # Route-specific app chunks
│   │   ├── webpack.js         # Runtime initialization
│   │   ├── main-app.js        # React app shell
│   │   └── polyfills.js       # Browser polyfills
│   ├── css/                   # Compiled CSS files
│   │   └── app/               # Route-specific CSS
│   ├── media/                 # Fonts and media assets (woff2, etc.)
│   ├── development/           # Dev-time manifests (HMR, etc.)
│   └── webpack/               # HMR hot-update artifacts
├── server/                     # Server-side bundles (Node.js)
│   └── app/                   # App Router server files
├── app-build-manifest.json     # Client bundle ↔ route mapping
├── build-manifest.json         # Global bundle metadata
├── routes-manifest.json        # Headers, rewrites, redirects
├── prerender-manifest.json     # Static generation metadata
└── cache/                      # Build cache (SWC, webpack, etc.)

public/                         # Static assets (copied as-is to root)
├── dragontail/               # Game data files
├── mockServiceWorker.js      # MSW (Mock Service Worker)
└── *.svg, *.ico              # SVGs, favicons, etc.

storybook-static/              # Separate Storybook build (not used by Next)
```

## Request Path → Filesystem Location

### Homepage & Pages

| Request Path | Served From | File Location |
|---|---|---|
| **GET /** | Client + Server RSC | `/.next/static/chunks/app/page.js` (browser)<br/>`/.next/server/app/page.js` (server) |
| **GET /** | Shared chunks | `/_next/static/chunks/webpack.js`<br/>`/_next/static/chunks/main-app.js` |

### Styling & Global Assets

| Request Path | Served From | File Location |
|---|---|---|
| `/_next/static/css/app/layout.css` | Compiled Tailwind + global CSS | `/.next/static/css/app/layout.css` |
| `/_next/static/media/*.woff2` | Google Fonts (Geist) | `/.next/static/media/` |
| Example: `/_next/static/media/8d697b304b401681-s.woff2` | Geist Sans | `/.next/static/media/8d697b304b401681-s.woff2` |

### API Routes

| Request Path | Handler Location | Server Bundle |
|---|---|---|
| **GET/POST /api/summoner** | `src/app/api/summoner/route.ts` | `/.next/server/app/api/summoner/route.js` |
| **GET/POST /api/summoner/[puuid]/matches** | `src/app/api/summoner/[puuid]/matches/route.ts` | `/.next/server/app/api/summoner/[puuid]/matches/route.js` |
| **GET /api/live-game** | `src/app/api/live-game/route.ts` | `/.next/server/app/api/live-game/route.js` |

### JavaScript Runtime Chunks

| Request Path | Purpose | File Location |
|---|---|---|
| `/_next/static/chunks/webpack.js` | Webpack/Turbopack runtime | `/.next/static/chunks/webpack.js` |
| `/_next/static/chunks/main-app.js` | React framework + app shell | `/.next/static/chunks/main-app.js` |
| `/_next/static/chunks/polyfills.js` | Browser polyfills | `/.next/static/chunks/polyfills.js` |
| `/_next/static/chunks/app/layout.js` | Layout component (client) | `/.next/static/chunks/app/layout.js` |
| `/_next/static/chunks/app/page.js` | Homepage component (client) | `/.next/static/chunks/app/page.js` |

### Public Static Assets

| Request Path | Served From | File Location |
|---|---|---|
| `/mockServiceWorker.js` | MSW Worker | `/public/mockServiceWorker.js` |
| `/dragontail/manifest.json` | Game data | `/public/dragontail/manifest.json` |
| `/dragontail/data/champions.json` | Champion data | `/public/dragontail/data/champions.json` |
| `/favicon.ico` | Favicon route handler | `/public/` (also `/.next/server/app/favicon.ico/route.js`) |
| `/file.svg`, `/globe.svg` | Static vectors | `/public/*.svg` |

### Build Manifests (Metadata)

These aren't served to browsers but control bundle resolution:

| File | Purpose | Location |
|---|---|---|
| `app-build-manifest.json` | Maps routes → client bundles | `/.next/app-build-manifest.json` |
| `build-manifest.json` | Global bundle metadata | `/.next/build-manifest.json` |
| `routes-manifest.json` | Headers, rewrites, redirects | `/.next/routes-manifest.json` |
| `app-paths-manifest.json` | Maps routes → server files | `/.next/server/app-paths-manifest.json` |

### Storybook (Separate Build)

| Request Path | File Location |
|---|---|
| `storybook-static/index.html` | Storybook main page |
| `storybook-static/assets/*.js` | Storybook component stories |
| `storybook-static/iframe.html` | Storybook canvas |

---

## How Bundle Loading Works

### For a page request (e.g., GET /)

1. **Server processes request**
   - Finds route handler at `.next/server/app/page.js`
   - Renders React component tree (RSC + client components)
   - Sends HTML + embedded script tags

2. **Browser receives HTML with script tags**
   ```html
   <script src="/_next/static/chunks/webpack.js"></script>
   <script src="/_next/static/chunks/main-app.js"></script>
   <script src="/_next/static/chunks/app/page.js"></script>
   ```

3. **Browser hydrates page**
   - Webpack runtime initializes
   - React app shell loads
   - Page-specific code attaches to DOM

### For an API request (e.g., GET /api/summoner)

1. **Server matches route** → `.next/server/app/api/summoner/route.js`
2. **Executes handler** → returns JSON/response
3. **Browser receives response** (no client bundles involved)

---

## CSS Resolution

All CSS is compiled and linked from `/.next/static/css/`:
- **Source**: `src/app/globals.css` (Tailwind + custom CSS) + route-specific CSS
- **Output**: `/.next/static/css/app/layout.css`
- **Referenced in HTML**: `<link rel="stylesheet" href="/_next/static/css/app/layout.css">`

Fonts are embedded in CSS via `@font-face` rules pointing to `/_next/static/media/`.

---

## Development vs Production Artifacts

### Development Build (After `npm run dev`)
- `.next/static/development/` contains build manifests
- `.next/static/webpack/` contains HMR hot-update files
- Turbopack watches for changes and incremental rebuilds
- Source maps available for debugging

### Production Build (After `npm run build`)
- All bundles are minified and optimized
- No development manifests
- No HMR artifacts
- Ready for `npm run start` or deployment

---

## Key Files to Check During Debugging

| Scenario | Check File |
|---|---|
| Route not loading | `.next/app-build-manifest.json` (client chunks) + `.next/server/app-paths-manifest.json` (server) |
| CSS not applied | `.next/static/css/app/layout.css` (verify file exists) |
| API 404 | `.next/server/app/api/*/route.js` (verify handler exists) |
| Custom headers not applied | `.next/routes-manifest.json` (verify in `headers` array) |
| Font not loading | `.next/static/css/app/layout.css` (check `@font-face` src URLs) |
| Stale bundle | Delete `.next/` and rebuild: `rm -rf .next && npm run build` |

---

## Common Paths Reference

```bash
# Production build entry
/.next/static/chunks/webpack.js        # Always first in script order
/.next/static/chunks/main-app.js       # React framework
[route-specific].js                    # Page or component bundle

# Route resolution
next.config.ts                         # Next configuration
src/app/*/route.ts                     # API routes or App Router handlers

# Assets
/public/                               # Anything here → / at runtime
/_next/static/                         # Compiled bundles (not public/)
```

