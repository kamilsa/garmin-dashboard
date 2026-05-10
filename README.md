# Garmin Health Dashboard

A privacy-focused web app that visualizes health/fitness data from Garmin Connect using an Apple-style Bento Box design. Three-layer architecture: Python data extractor → SQLite → Express API → React frontend.

![Dashboard Preview](https://raw.githubusercontent.com/kamilsa/garmin-dashboard/main/dashboard/src/assets/hero.png)

## Features

- **Apple-style Bento Box Layout** — Modern, minimal UI with soft rounded corners and high-contrast typography
- **3D Activity Maps** — Mapbox GL JS with 3D terrain (1.5x exaggeration) and 60° pitch for outdoor routes
- **AI Assistant** — Chat with your health data using a local LLM (Ollama). Ask questions like "how was my sleep this week?" and get answers backed by real data
- **Food Tracker** — Photo-based nutrition logging with AI-powered macro estimation (via OpenRouter vision model)
- **Comprehensive Health Metrics** — Steps, calories, sleep stages, Body Battery, stress, heart rate, VO2 Max, weight trends
- **One-Click Sync** — Refresh button triggers data extraction from Garmin Connect
- **Dark & Light Mode** — CSS variable-based theming
- **Privacy First** — All data stored locally in SQLite. Credentials never leave your machine.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Data Extraction | [garmin-health-data](https://github.com/diegoscarabelli/garmin-health-data) (Python) |
| Database | SQLite (`garmin_data.db`) |
| Backend | Node.js, Express 5, better-sqlite3 |
| Frontend | React 19, TypeScript, Tailwind CSS v4, Recharts 3, Mapbox GL JS 3 |
| AI (optional) | Ollama (chat), OpenRouter (food analysis) |

## Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **Mapbox API token** — [Sign up](https://account.mapbox.com/auth/signup/) (free tier is generous)
- **Garmin Connect account** — Your Garmin login credentials

Optional:
- **[Ollama](https://ollama.com)** — For the AI chat assistant
- **OpenRouter API key** — For AI-powered food photo analysis

## Setup

### 1. Clone and install Python dependencies

```bash
git clone https://github.com/kamilsa/garmin-dashboard.git
cd garmin-dashboard

# Create a Python virtual environment and install the extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -e garmin-health-data/
```

### 2. Log into your Garmin account

This is a one-time step. Run:

```bash
.venv/bin/garmin auth
```

You'll be prompted for your Garmin Connect email and password. If you have **MFA/2FA** enabled, you'll also be prompted for the code.

> **What happens during login:** The tool tries several authentication strategies in sequence (web portal, mobile portal, widget) to get OAuth tokens. You may see a **30–45 second pause** after entering credentials — this is normal. It's a deliberate delay to avoid triggering Garmin's Cloudflare rate limiting. Tokens are stored locally in `~/.garminconnect/<user_id>/` and auto-refreshed. Your password is never saved.

Once authenticated, extract your data:

```bash
.venv/bin/garmin extract
```

The first run pulls the last 30 days. Subsequent runs auto-resume from where you left off.

> **Multi-account:** To extract data from multiple Garmin accounts (e.g., family), run `garmin auth` once per account. All accounts are discovered and extracted automatically.

### 3. Set up API tokens

Create two files in the project root:

```bash
# Mapbox token (required for activity maps)
echo "pk.your-mapbox-token-here" > mapbox_token

# OpenRouter token (optional — for AI food photo analysis)
echo "sk-or-v1-your-openrouter-key-here" > or_token
```

Both files are git-ignored.

### 4. Install and start the backend

```bash
cd dashboard/server
npm install
node index.js
```

Runs on **http://localhost:3001** (binds to `0.0.0.0` so it's accessible from other devices on your LAN).

### 5. Install and start the frontend

```bash
cd dashboard
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

### 6. (Optional) Set up the AI assistant

The chat widget connects to a local Ollama instance:

```bash
# Install Ollama: https://ollama.com
ollama pull llama3.2    # or any model you prefer
```

The dashboard automatically discovers available Ollama models — you can switch between them in the chat UI.

## Project Structure

```text
.
├── garmin_data.db              # SQLite database (git-ignored)
├── mapbox_token                # Mapbox API key (git-ignored)
├── or_token                    # OpenRouter API key (git-ignored)
├── garmin-health-data/         # Python data extraction library
├── dashboard/
│   ├── src/
│   │   ├── components/         # React widgets (each self-contained)
│   │   └── App.tsx             # Main Bento grid layout
│   └── server/
│       ├── index.js            # Express API server
│       └── mcp-server.js       # MCP tools for AI assistant
└── .venv/                      # Python virtual environment
```

## Usage

### Syncing new data

Click the **Sync** button in the dashboard, or run:

```bash
.venv/bin/garmin extract
```

The dashboard auto-refreshes all widgets after a sync.

### AI Assistant

Open the chat panel (bottom-right button) and ask questions like:

- "How was my sleep this week?"
- "What's my average resting heart rate over the last 7 days?"
- "Compare my VO2 Max trend with my training load"

The assistant can only run read-only queries — it cannot modify your data.

### Food Tracker

Take a photo of your meal and the AI estimates macros (calories, protein, carbs, fat). Entries are editable inline. Uses OpenRouter's vision model for analysis.

## Authentication Details

- **Token storage:** OAuth tokens live in `~/.garminconnect/<user_id>/garmin_tokens.json`. Directories are created with `0o700` permissions, files with `0o600`.
- **Token lifetime:** Access tokens last ~18 hours. Refresh tokens last 30 days and rotate on each use. As long as you sync at least once every 30 days, tokens stay valid indefinitely.
- **Re-authentication:** If tokens expire (30+ days of inactivity), re-run `garmin auth`.
- **MFA:** Supported out of the box. You'll be prompted for the code during login.
- **Login strategies:** The tool tries 5 strategies in order: portal web (curl_cffi), portal web (requests), mobile portal (curl_cffi), mobile (requests), widget (curl_cffi). It stops at the first successful one.

## API Endpoints

| Endpoint | Purpose |
|---------|---------|
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
| `GET /api/food-log` | Food entries (query: `days`, `limit`) |
| `POST /api/food-log` | Create food entry (image analysis via OpenRouter) |
| `PUT /api/food-log/:id` | Update food entry fields |
| `DELETE /api/food-log/:id` | Delete food entry |
| `GET /api/config` | Mapbox token |

## License

Apache-2.0
