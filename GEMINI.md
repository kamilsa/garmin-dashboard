# Gemini Dashboard Project Guide

## Project Overview
The Garmin Health Dashboard is a modular, privacy-focused web application designed to visualize health and fitness data extracted from Garmin Connect. The project uses an **Apple-style Bento Box** design language, characterized by a clean, minimal UI, soft rounded corners, and discrete data cards.

### Architecture
- **Frontend**: React (Vite) application using Tailwind CSS v4 for styling and Recharts for data visualization.
- **Backend**: Node.js Express server that interfaces with a local SQLite database (`garmin_data.db`) using `better-sqlite3`.
- **AI Assistant**: A specialized chat widget that leverages a local LLM (via LiteLLM proxy) and the **Model Context Protocol (MCP)** to query health data using natural language.
- **Data Layer**: Data is extracted into SQLite by the `garmin-health-data` Python library.

## Building and Running

### 1. Data Setup
The dashboard relies on a local `garmin_data.db`.
```bash
# Sync latest data from Garmin Connect
.venv/bin/garmin extract
```

### 2. Backend Server
The server handles API requests and AI orchestration.
```bash
cd dashboard/server
npm install
node index.js
```
*Runs on: http://localhost:3001*

### 3. Frontend Dashboard
The React application provides the visual interface.
```bash
cd dashboard
npm install
npm run dev
```
*Runs on: http://localhost:5173*

### 4. AI Assistant (LiteLLM)
Ensure your LiteLLM proxy is running on port 4000 with the `glm-4.7-flash` model mapped correctly to Ollama.

## Development Conventions

### UI/UX Standards
- **Bento Grid**: Use a responsive grid layout. The current primary layout is a 3-row grid locked to the viewport height (`h-screen`).
- **Glassmorphism**: Use `backdrop-blur` and semi-transparent backgrounds for floating elements like the Chat Assistant.
- **Theming**: Support both Light and Dark modes using CSS variables defined in `src/index.css` (`--apple-bg`, `--apple-card`, `--apple-text-primary`).
- **Typography**: Metrics should be bold/black (`font-black`) and use `text-primary` for high contrast.

### Component Structure
- Widgets are located in `dashboard/src/components/`.
- Each widget should handle its own data fetching via `axios` from the `/api/` endpoints.
- Complexity (like Mapbox initialization or Portal rendering) should be encapsulated within the specific widget.

### AI Integration
- The backend `/api/chat` endpoint connects directly to a local **Ollama** server (port 11434).
- It uses a custom **Tool-Calling** loop to execute read-only SQLite queries directly via `better-sqlite3`.
- **Timezone Awareness**: The assistant is instructed to automatically convert UTC database timestamps to the user's local timezone (detected via `getTimezoneOffset`).
- **Security**: The assistant is restricted to read-only `SELECT` statements and basic schema discovery (`list_tables`).
- **Models**: Supports the `glm-4.7-flash` model by default (or any model available in the local Ollama instance).

### API Endpoints
- `GET /api/summary`: Steps and active calories.
- `GET /api/sleep`: Sleep stages and scores.
- `GET /api/wellness`: Body Battery, stress, and HR time-series.
- `GET /api/activities`: List of recent activities with sport-specific metrics.
- `GET /api/activity/:id/path`: GPS coordinates for Mapbox.
- `GET /api/biometrics`: VO2 Max and Weight trends.
- `POST /api/refresh`: Triggers a background `garmin extract`.
- `POST /api/chat`: AI Assistant orchestrator.
