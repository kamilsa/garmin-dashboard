# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Garmin Health Dashboard — a privacy-focused web app that visualizes health/fitness data from Garmin Connect using an Apple-style Bento Box design. Three-layer architecture: Python data extractor → SQLite → Express API → React frontend.

## Commands

### Frontend (`dashboard/`)
```bash
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # eslint .
```

### Backend (`dashboard/server/`)
```bash
npm install        # install deps
node index.js      # Express server on :3001 (binds 0.0.0.0)
```
No build step — plain CommonJS (`require()`). No test framework configured.

### Data sync
```bash
.venv/bin/garmin auth      # one-time Garmin Connect authentication
.venv/bin/garmin extract   # sync data from Garmin Connect → garmin_data.db
```

### Python library (`garmin-health-data/`)
```bash
pip install -e ".[dev]"    # dev install
pytest -v                  # run tests
make format                # auto-format (black, autoflake, docformatter, sqlfluff)
make check-format          # check formatting
```

## Architecture

**Data flow**: `garmin-health-data` CLI (Python) → `garmin_data.db` (SQLite at repo root) → Express server (`dashboard/server/index.js`, port 3001) → React frontend (`dashboard/src/`, port 5173)

**Frontend** — React 19 + TypeScript, Vite 8, Tailwind CSS v4, Recharts 3, Mapbox GL JS 3. Each widget in `src/components/` fetches its own data via axios from `/api/` endpoints. API base URL is derived from `window.location` hostname with port 3001 (not a hardcoded localhost — supports LAN access).

**Backend** — Express 5 (CommonJS), better-sqlite3 for DB, @modelcontextprotocol/sdk for MCP. Binds to `0.0.0.0:3001` so the dashboard is accessible from other devices on the network. The AI chat (`POST /api/chat`) connects to a local Ollama instance (port 11434) with MCP-first tool calling, falling back to direct SQLite if MCP is unavailable. Up to 5 rounds of tool calling per request. All DB queries from the AI are restricted to read-only SELECT.

**Database** — `garmin_data.db` is the single shared data store. Schema defined in `garmin-health-data/garmin_health_data/tables.ddl`. The server also creates two additional tables at startup: `chat_memory` (conversation persistence) and `food_log` (nutrition tracking with image data).

**MCP server** — `dashboard/server/mcp-server.js` exposes SQLite query tools for the AI assistant.

**Food Tracker** — Image-based nutrition tracking. Users photograph food, an OpenRouter vision model (stored in `or_token`) analyzes the image and estimates macros, results are saved to `food_log` table. Entries are editable inline. The `food_log` table stores base64 image data (`image_data`) separately from thumbnails to keep list queries fast — use `FOOD_LOG_SELECT_COLUMNS` (without image_data) for list endpoints.

## Key API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/summary` | Steps & active calories (7 days) |
| `GET /api/sleep` | Sleep sessions & stages (7 sessions) |
| `GET /api/wellness` | Stress, Body Battery, HR time-series |
| `GET /api/activities` | Recent activities with sport-specific metrics |
| `GET /api/activity/:id/path` | GPS path JSON for Mapbox |
| `GET /api/activity/:id/ts` | Time-series sensor data (downsampled to 300 points) |
| `GET /api/biometrics` | VO2 Max & weight trends (30 days) |
| `GET /api/fitness-age` | Calculated fitness age |
| `POST /api/refresh` | Triggers `garmin extract` data sync |
| `POST /api/chat` | AI assistant (Ollama + MCP/SQLite tools) |
| `GET /api/config` | Mapbox token |
| `GET /api/food-log` | Food entries (query: `days`, `limit`) |
| `POST /api/food-log` | Create food entry (image analysis via OpenRouter) |
| `PUT /api/food-log/:id` | Update food entry fields |
| `DELETE /api/food-log/:id` | Delete food entry |

## UI Conventions

- **Bento Grid**: 4-column, 3-row grid on desktop (`md:grid-cols-4 md:grid-rows-3`), single-column stack on mobile. Locked to viewport height on desktop.
- **Theming**: CSS variables in `src/index.css` (`--apple-bg`, `--apple-card`, `--apple-text-primary/secondary/tertiary`). Dark mode via `.dark` class on `<html>`
- **Glassmorphism**: `backdrop-blur` + semi-transparent backgrounds for floating elements (Chat Assistant overlay)
- **Typography**: Metrics use `font-black` and `text-primary` for high contrast
- **Widget re-fetch**: Widgets receive a `key` prop tied to `refreshKey` state — incrementing forces re-mount and re-fetch after sync
- **Mobile**: Responsive with `md:` breakpoints; widgets stack vertically with explicit `min-h-` values on mobile

## Important Notes

- `garmin-health-data/` is a separate Git repo (external library clone, git-ignored at root level)
- `garmin_data.db`, `mapbox_token`, and `or_token` are git-ignored
- Backend uses CommonJS (`require()`); frontend uses ESM imports
- The AI assistant's timezone awareness comes from the backend injecting the user's local timezone offset into the system prompt
- Conversation memory for the AI chat is persisted in a `chat_memory` SQLite table
- Food tracker uses OpenRouter API (token in `or_token` file) for vision-based food analysis
