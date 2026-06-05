# .next Production Build Structure & Chunk Loading Guide

This guide explains the actual production build output after `npm run build` with Turbopack, including which chunks load first and their purposes.

## Directory Structure Overview

```
.next/
├── static/                      # Client-side bundles served to browser
│   ├── chunks/                 # JavaScript bundles (hashed names)
│   ├── media/                  # Fonts and preloaded assets
│   └── 2q4bRnF6l2UZeSbLa5Av1/  # Build ID directory (cache buster)
│       ├── _buildManifest.js   # Route metadata
│       ├── _ssgManifest.js     # Static generation info
│       └── _clientMiddlewareManifest.json
├── server/                      # Server-side bundles (Node.js runtime)
│   ├── app/                    # App Router RSC & route handler files
│   ├── middleware-manifest.json
│   ├── app-paths-manifest.json
│   └── server-reference-manifest.json
├── app-build-manifest.json      # Route → client chunks mapping
├── build-manifest.json          # Legacy page routing metadata
├── routes-manifest.json         # Headers, redirects, rewrites
├── prerender-manifest.json      # Static generation info
├── required-server-files.json   # Files needed to run server
├── BUILD_ID                     # Current build hash (for cache busting)
├── cache/                       # Build cache (SWC, Turbopack)
├── build/                       # Turbopack build metadata
└── diagnostics/                 # Build diagnostics
```

---

## Client-Side Chunks (.next/static/chunks/)

### Critical Load Order (What Loads First)

**When a page request comes in, the browser loads chunks in this order:**

```
1. Polyfills (browser compatibility)
   └─ static/chunks/a6dad97d9634a72d.js (110 KB)

2. Core Runtime (MUST load first for app to work)
   ├─ static/chunks/turbopack-98424bbd631379aa.js (9.8 KB) ← Turbopack runtime
   ├─ static/chunks/569f8ca39997ccda.js (87 KB) ← React + Next.js internals
   └─ static/chunks/aaea1e64ef7e0faa.js (13 KB) ← App initialization

3. Framework Chunk (React SSR reconciliation)
   └─ static/chunks/db8f8797ab57ee2a.js (253 KB) ← Main React library

4. Route-Specific Code (page or component logic)
   ├─ static/chunks/060f9a97930f3d04.js (32 KB) for / (homepage)
   └─ static/chunks/e52e6da9432c606f.js (33 KB) for / (homepage specific)
```

### Chunk Inventory by Size & Purpose

| Chunk File | Size | Purpose | When Loaded |
|---|---|---|---|
| `557412297f525bd4.js` | 292 KB | **Shared dependencies** (MSW, React Testing, components) | Every page |
| `c5074ffebcf83c8f.js` | 275 KB | **Navigation/routing internals** | Every page |
| `db8f8797ab57ee2a.js` | 253 KB | **React library** | Every page |
| `a6dad97d9634a72d.js` | 112 KB | **Polyfills** (ES6+, Promise, etc.) | Page load (if needed) |
| `569f8ca39997ccda.js` | 87 KB | **Next.js runtime** | Every page |
| `e52e6da9432c606f.js` | 33 KB | **Homepage route chunk** | Only on `/` |
| `060f9a97930f3d04.js` | 32 KB | **Error fallback component** | Error boundary or 404 page |
| `e60ef129113f6e24.js` | 14 KB | **_app wrapper** | Every page (legacy reference) |
| `aaea1e64ef7e0faa.js` | 13 KB | **App shell initialization** | Every page |
| `17722e3ac4e00587.js` | 20 KB | **Error page handler** | Error pages only |
| `turbopack-98424bbd631379aa.js` | 9.8 KB | **Turbopack runtime** | Every page |
| `turbopack-b7faeb0075a7d9a1.js` | 9.8 KB | **_app Turbopack runtime** | _app page |
| `turbopack-5b322551608fd6d8.js` | 9.8 KB | **Error Turbopack runtime** | Error pages |
| `8d39404a0458634c.js` | 0.7 KB | **Small module** | Conditionally |
| `1188120e8e434f5c.js` | 0.2 KB | **Tiny module/polyfill** | Conditionally |

### Font Media Files (.next/static/media/)

Hashed Google Fonts (Geist Sans & Geist Mono):

| File | Size | Font | Unicode Range |
|---|---|---|---|
| `797e433ab948586e-s.p.dbea232f.woff2` | 31 KB | Geist Sans Latin (preload) | Basic Latin |
| `caa3a2e1cccd8315-s.p.853070df.woff2` | 25 KB | Geist Mono Latin (preload) | Basic Latin |
| `7178b3e590c64307-s.b97b3418.woff2` | 15 KB | Geist Mono Latin-ext | Extended Latin |
| `4fa387ec64143e14-s.c1fdd6c2.woff2` | 12 KB | Geist Sans Latin-ext | Extended Latin |
| `bbc41e54d2fcbd21-s.799d8ef8.woff2` | 13 KB | Geist Sans Cyrillic | Cyrillic |
| `8a480f0b521d4e75-s.8e0177b5.woff2` | 14 KB | Geist Mono Cyrillic | Cyrillic |
| `favicon.0b3bf435.ico` | 25 KB | Favicon | Image |

---

## Route-to-Chunk Mapping (app-build-manifest.json)

This file tells the browser which chunks to load for each route:

### Homepage Route
**Route:** `/page` (or `/`)
```json
"chunks": [
  "static/chunks/060f9a97930f3d04.js",      ← Error fallback
  "static/chunks/538e2fe53d567055.css",     ← CSS file
  "static/chunks/8d39404a0458634c.js",      ← Module
  "static/chunks/e52e6da9432c606f.js",      ← Homepage code ← THIS IS PAGE-SPECIFIC
  "static/chunks/aaea1e64ef7e0faa.js",      ← App init (shared)
  "static/chunks/db8f8797ab57ee2a.js",      ← React (shared)
  "static/chunks/569f8ca39997ccda.js",      ← Next.js runtime (shared)
  "static/chunks/turbopack-98424bbd631379aa.js" ← Runtime (shared)
]
```

### 404 Not Found Route
**Route:** `/_not-found/page`
```json
"chunks": [
  "static/chunks/060f9a97930f3d04.js",      ← 404 page component (route-specific)
  "static/chunks/538e2fe53d567055.css",     ← CSS
  "static/chunks/8d39404a0458634c.js",
  "static/chunks/aaea1e64ef7e0faa.js",
  "static/chunks/db8f8797ab57ee2a.js",
  "static/chunks/569f8ca39997ccda.js",
  "static/chunks/turbopack-98424bbd631379aa.js"
]
```

### Core Chunks (Loaded on EVERY page)
These are always included regardless of route:
```json
"rootMainFiles": [
  "static/chunks/aaea1e64ef7e0faa.js",        ← App shell
  "static/chunks/db8f8797ab57ee2a.js",        ← React
  "static/chunks/569f8ca39997ccda.js",        ← Next.js runtime
  "static/chunks/turbopack-98424bbd631379aa.js" ← Turbopack
]
```

### Polyfills (Conditionally Loaded)
```json
"polyfillFiles": [
  "static/chunks/a6dad97d9634a72d.js"        ← Loaded if browser lacks ES6+ support
]
```

---

## Server-Side Bundles (.next/server/)

These files run on Node.js to render pages and handle API requests.

### Server Files Structure

```
.next/server/app/
├── page.js                          # Homepage route handler
├── page_client-reference-manifest.js # Client component map for RSC
├── page.js.nft.json                 # NFT (needed files) manifest
├── page.js.map                      # Source map (debug)
│
├── index.html                       # Pre-rendered HTML for SSG
├── index.rsc                        # RSC (React Server Component) payload
├── index.meta                       # Route metadata
│
├── _not-found/                      # 404 handler
│   ├── page.js
│   ├── _not-found.html
│   ├── _not-found.rsc
│   └── _not-found.meta
│
├── api/
│   ├── summoner/
│   │   ├── route.js                 # GET/POST /api/summoner
│   │   └── ...
│   ├── live-game/
│   │   ├── route.js                 # GET /api/live-game
│   │   └── ...
│   └── [puuid]/
│       └── matches/
│           └── route.js             # GET /api/summoner/[puuid]/matches
│
└── favicon.ico/
    ├── route.js                     # Favicon route handler
    └── favicon.ico.body             # Binary favicon data
```

### What Each Server File Does

| File | Purpose | Generated From |
|---|---|---|
| `page.js` | Renders page on each request (or serves pre-rendered HTML if static) | `src/app/page.tsx` |
| `page.js.nft.json` | Lists all dependencies needed for this file at runtime | Turbopack analysis |
| `page_client-reference-manifest.js` | Maps client component identifiers for RSC streaming | React Server Components |
| `*.html` | Pre-rendered static HTML (if route is static) | Built during compile |
| `*.rsc` | React Server Component payload (serialized JSX for hydration) | RSC compilation |
| `route.js` | API endpoint handler | `src/app/api/*/route.ts` |

---

## Manifest Files (Control Build Behavior)

### app-build-manifest.json
**Purpose:** Maps which chunks each route needs

```json
{
  "pages": {
    "/page": ["chunks/...", "chunks/..."],  ← What to load for /
    "/_not-found/page": ["chunks/..."],     ← What to load for 404
  }
}
```

**Key rule:** Every entry includes:
1. Error fallback chunk (if available)
2. CSS file (if generated)
3. Shared core chunks (always same)
4. Route-specific chunk (different per route)

### build-manifest.json
**Purpose:** Legacy routing (for Pages Router, not used in App Router)

```json
{
  "pages": {
    "/_app": ["chunks/..."],
    "/_error": ["chunks/..."]
  },
  "rootMainFiles": ["chunks/..."],  ← Always load these
  "polyfillFiles": ["chunks/..."]   ← Conditionally load
}
```

### app-paths-manifest.json
**Purpose:** Maps routes to server files

```json
{
  "/page": "app/page.js",
  "/api/summoner/route": "app/api/summoner/route.js",
  "/api/summoner/[puuid]/matches/route": "app/api/summoner/[puuid]/matches/route.js"
}
```

### routes-manifest.json
**Purpose:** Runtime routing configuration

```json
{
  "version": 3,
  "basePath": "",
  "headers": [...],         ← Security headers from next.config.ts
  "redirects": [...],       ← URL redirects
  "rewrites": {...}         ← URL rewrites
}
```

### prerender-manifest.json
**Purpose:** Static generation (SSG) routes

```json
{
  "version": 4,
  "routes": {},             ← Routes to pre-render
  "dynamicRoutes": {},      ← Dynamic routes with ISR
  "notFoundRoutes": [],     ← Routes that result in 404
  "preview": {...}          ← Preview mode settings
}
```

---

## How Browser Loads a Page

### Step-by-Step Loading Sequence

**1. HTML Response from Server**
```html
<script src="/_next/static/chunks/a6dad97d9634a72d.js"></script>
<script src="/_next/static/chunks/turbopack-98424bbd631379aa.js"></script>
<script src="/_next/static/chunks/569f8ca39997ccda.js"></script>
<script src="/_next/static/chunks/aaea1e64ef7e0faa.js"></script>
<script src="/_next/static/chunks/db8f8797ab57ee2a.js"></script>
<script src="/_next/static/chunks/e52e6da9432c606f.js"></script>
```

**2. Browser Executes in Order**
- Polyfills load first (if needed)
- Runtime initializes (Turbopack)
- Next.js framework loads
- App shell attaches to DOM
- Route-specific code executes
- Page becomes interactive (hydration)

**3. CSS & Fonts**
- Fonts downloaded in parallel while JS loads
- CSS linked via `<link rel="stylesheet">`
- Layout shift prevented by font-display: swap

**4. Total Time**
- Core chunks: ~370 KB (measured above)
- Fonts: ~100 KB
- First meaningful paint: ~2-3 seconds typical

---

## Production Build Specifics

### What's Different from Development

| Aspect | Development | Production |
|---|---|---|
| Chunk names | Short (webpack.js) | Hashed (569f8ca39997ccda.js) |
| Source maps | Included | Separate `.map` files only |
| Minification | No | Yes (40-50% size reduction) |
| HMR files | `.next/static/webpack/` | Not included |
| Cache busting | Timestamp | BUILD_ID (contents-based) |
| Speed | Slower, incremental | Optimized, fully analyzed |

### BUILD_ID File

```bash
cat .next/BUILD_ID
# Output: 2q4bRnF6l2UZeSbLa5Av1
```

This ID:
- Changes when build output changes
- Used to invalidate browser cache
- Stored in directory names: `.next/static/2q4bRnF6l2UZeSbLa5Av1/`
- Ensures new deploys don't serve stale bundles

---

## Chunk Size & Load Analysis

### Total Bundle Size Breakdown

```
Polyfills:           112 KB
React library:       253 KB
Next.js runtime:      87 KB
Shared deps/MSW:     292 KB  (557412297f525bd4.js)
Navigation/routing:  275 KB  (c5074ffebcf83c8f.js)
App initialization:   13 KB
Turbopack runtime:   ~10 KB
────────────────────────────
Subtotal:          1,042 KB

Route-specific:
  / (homepage):      33 KB
  /404:              32 KB
  
FONTS (parallel):   ~100 KB

TOTAL FIRST LOAD:  ~1.2 MB (gzipped: ~350 KB)
```

### How to Reduce

1. **Code splitting:** Route-specific chunks load separately ✓ (already done)
2. **Dynamic imports:** `import()` splits large features
3. **Remove unused deps:** MSW might be overkill in production
4. **Image optimization:** Use `next/image` (20-50% savings)
5. **Compression:** Gzip on server (3x reduction already applied)

---

## Key Files When Debugging

| Issue | File to Check |
|---|---|
| Route not rendering | `.next/server/app-paths-manifest.json` + check `.next/server/app/*/page.js` exists |
| CSS not loading | `.next/app-build-manifest.json` (verify CSS chunk listed) |
| API returning 404 | `.next/server/app/api/*/route.js` exists? |
| Chunks not loaded | Browser DevTools Network tab + `.next/app-build-manifest.json` |
| Font not displaying | `.next/static/media/` + verify font file hash matches CSS |
| Custom headers not applied | `.next/routes-manifest.json` under `headers` array |
| Pages not pre-rendered | `.next/prerender-manifest.json` (should list static routes) |
| Stale bundle in production | Clear browser cache + check BUILD_ID changed in `.next/BUILD_ID` |

---

## Quick Reference: Files in .next Root

| File/Directory | Purpose |
|---|---|
| `BUILD_ID` | Current build hash (cache buster) |
| `app-build-manifest.json` | Route → chunks mapping |
| `build-manifest.json` | Legacy Pages Router metadata |
| `routes-manifest.json` | Headers/rewrites/redirects |
| `prerender-manifest.json` | Static generation config |
| `required-server-files.json` | Files needed by `next start` |
| `static/` | Client bundles and fonts |
| `server/` | SSR and API route handlers |
| `cache/` | SWC/Turbopack build cache |
| `build/` | Turbopack metadata |
| `package.json` | (minimal) Next.js version |
| `postcss.js` | PostCSS config for server |

