# VS Code Launch Configuration Explained

## `configurations` vs `compounds`

### `configurations`
An array of **individual debug targets**. Each entry defines how to launch or attach to a single process — what runtime to use, what program to run, what environment to set, etc. You pick one from the debug dropdown and run it alone.

### `compounds`
An array of **named groups** that launch multiple configurations simultaneously. Each compound entry has a `configurations` array of **name strings** that must exactly match the `name` field of existing configurations. When you start a compound, VS Code launches all listed configurations at once.

**Yes — you reference configurations by their `name` string:**
```jsonc
"compounds": [
    {
        "name": "App: Client local + server Docker debug",
        "configurations": [
            "Client: Next.js + Chrome",          // must match a config's "name"
            "Server: Attach to Docker (remote Delve)"  // must match a config's "name"
        ],
        "stopAll": true
    }
]
```
You can list as many names as you want — there's no limit.

---

## Parameter Reference

### Shared / Top-level

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `name` | Display label shown in the debug dropdown | Any string: `"Server: Launch locally"` |
| `type` | Which VS Code debug extension handles this session | `"node"`, `"go"`, `"pwa-chrome"`, `"python"`, `"java"` |
| `request` | Whether to **start** a new process or **attach** to an existing one | `"launch"`, `"attach"` |

---

### Process / Program

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `program` | Path to the entry point to launch (script, binary, or folder) | `"${workspaceFolder}/client/node_modules/next/dist/bin/next"` (Node binary), `"${workspaceFolder}/server/cmd/server"` (Go package folder) |
| `args` | CLI arguments passed to `program` | `["dev"]`, `["--port", "8080"]` |
| `cwd` | Working directory the process runs in | `"${workspaceFolder}/client"` |
| `console` | Where stdout/stderr appear | `"integratedTerminal"`, `"externalTerminal"`, `"internalConsole"` |
| `restart` | Auto-restart the debugger when the process exits (useful for file-watch servers) | `true`, `false` |

---

### Environment

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `env` | Key/value pairs injected as environment variables | `{ "NODE_OPTIONS": "--inspect", "PORT": "4000" }` |
| `envFile` | Path to a `.env` file — loaded before `env` overrides | `"${workspaceFolder}/server/.env"` |

---

### Source Maps (Node / Browser)

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `skipFiles` | Glob patterns for files to step **over** in the debugger | `["<node_internals>/**"]`, `["**/node_modules/**"]` |
| `resolveSourceMapLocations` | Where VS Code looks for `.map` files. Negations (`!`) exclude paths | `["${workspaceFolder}/client/**", "!**/node_modules/**"]` |
| `sourceMapPathOverrides` | Rewrite source map `sources` URLs to local file paths (needed for webpack) | `{ "webpack://_N_E/./*": "${webRoot}/*" }` |

---

### Browser Debugging

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `url` | URL to open when the browser debugger starts | `"http://localhost:3000"` |
| `webRoot` | Root directory for resolving web server files | `"${workspaceFolder}/client"` |

---

### `serverReadyAction` (Node `launch`)

Watches the process output and triggers an action when a ready-message is detected. Useful when the server prints its URL on startup.

```jsonc
"serverReadyAction": {
    "pattern": "- Local:.+(https?://.+)",  // regex applied to stdout
    "uriFormat": "%s",                      // how to format the matched URL (%s = capture group 1)
    "action": "debugWithChrome"             // what to do: "openExternally" | "debugWithChrome" | "debugWithEdge"
}
```

| Sub-field | Purpose |
|-----------|---------|
| `pattern` | Regex with a capture group that extracts the URL from server output |
| `uriFormat` | Template for the final URL. `%s` is replaced by the capture group |
| `action` | `"openExternally"` — open in default browser; `"debugWithChrome"` / `"debugWithEdge"` — open and attach debugger |

---

### Remote / Go Attach

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `mode` | Go-specific launch mode | `"debug"` (compile & run), `"remote"` (attach to running Delve), `"test"`, `"auto"` |
| `debugAdapter` | Which Delve adapter protocol to use | `"legacy"` (older DAP), `"dlv-dap"` (newer, default) |
| `dlvLoadConfig` | Delve runtime config (e.g. how much data to load) | `{ "maxStringLen": 1000, "maxArrayValues": 64 }` |
| `host` | Hostname of the remote Delve server | `"127.0.0.1"` |
| `port` | Port Delve is listening on | `2345` |
| `substitutePath` | Maps local paths → remote paths so Delve can find source files inside Docker/remote machines | `[{ "from": "${workspaceFolder}/server", "to": "/app" }]` |

---

### Task Hooks

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `preLaunchTask` | VS Code task **label** to run before the debug session starts | `"Server: Docker Debug Up"` |
| `postDebugTask` | VS Code task **label** to run after the debug session ends | `"Server: Docker Debug Down"` |

Tasks are defined in `.vscode/tasks.json` and matched by their `label`.

---

### Compound-only

| Parameter | Purpose | Examples / Values |
|-----------|---------|-------------------|
| `configurations` | Array of configuration **name strings** to launch together | `["Client: Next.js + Chrome", "Server: Attach to Docker (remote Delve)"]` |
| `stopAll` | When `true`, stopping any one configuration in the compound stops all others | `true`, `false` |

---

## How the Configurations in This Repo Work

```
Client: Next.js + Chrome
  └─ Launches Next.js dev server via Node with --inspect
  └─ Waits for "Local: http://..." in output, then opens Chrome with debugger attached

Client: Chrome (existing Next.js)
  └─ Skips starting Next.js — just attaches Chrome to an already-running localhost:3000

Server: Launch locally
  └─ Compiles and runs the Go server directly (no Docker), loads .env

Server: Attach to Docker (remote Delve)
  └─ Runs "Server: Docker Debug Up" task first (starts Docker with Delve on port 2345)
  └─ Attaches to Delve remotely; maps /app in container → local server/ folder
  └─ On stop, runs "Server: Docker Debug Down" task

App: Client local + server Docker debug  [COMPOUND]
  └─ Launches both "Client: Next.js + Chrome" and "Server: Attach to Docker (remote Delve)"
  └─ stopAll: true — stopping either one tears down both
```
