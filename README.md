# Garmin Health Dashboard

A modular, Apple-style Bento Box dashboard for visualizing personal health and fitness data extracted from Garmin Connect.

![Dashboard Preview](https://raw.githubusercontent.com/kamilsa/garmin-dashboard/main/dashboard/src/assets/hero.png)

## 🚀 Features

- **Apple-style Bento Box Layout**: A modern, minimal UI with soft rounded corners, subtle drop shadows, and high-contrast typography.
- **3D Activity Maps**: Interactive Mapbox integration with 3D terrain (1.5x exaggeration) and 60-degree pitch for outdoor activity routes.
- **Dual-View Activity Widget**: Toggle between a 3D map and detailed performance statistics for every activity.
- **Comprehensive Health Metrics**:
  - **Daily Steps & Calories**: Real-time progress tracking.
  - **Sleep & Recovery**: Detailed breakdown of sleep stages (Deep, Light, REM) and sleep scores.
  - **Wellness & Energy**: Body Battery trends, stress levels, and resting heart rate.
  - **Biometrics**: Long-term trends for VO2 Max and Weight.
- **One-Click Sync**: A built-in refresh button that triggers data extraction from Garmin Connect and reloads all widgets automatically.
- **Dark & Light Mode**: Seamless theming support with high-contrast visibility in both modes.
- **Privacy First**: Powered by a local SQLite database. Your credentials and health data stay on your machine.

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS (v4), Recharts, Lucide React.
- **Maps**: Mapbox GL JS (with 3D terrain support).
- **Backend**: Node.js, Express, Better-SQLite3.
- **Data Source**: [garmin-health-data](https://github.com/diegoscarabelli/garmin-health-data) library.

## 🏁 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A Mapbox API Token (stored in a file named `mapbox_token` in the root directory).

### 2. Setup Data
First, initialize the local database using the Garmin extraction tool:

```bash
# Create virtual environment and install extractor
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install garmin-health-data

# Authenticate (one-time setup)
.venv/bin/garmin auth

# Extract data
.venv/bin/garmin extract
```

### 3. Install Dependencies
```bash
# Install server dependencies
cd dashboard/server
npm install

# Install dashboard dependencies
cd ../
npm install
```

### 4. Run the Application
You need to run both the data server and the frontend:

**Start Data Server:**
```bash
cd dashboard/server
node index.js
```

**Start Frontend Dashboard:**
```bash
cd dashboard
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

```text
.
├── garmin_data.db          # Local SQLite database (git-ignored)
├── mapbox_token            # Your Mapbox API key (git-ignored)
├── dashboard/
│   ├── src/                # React frontend source
│   │   ├── components/     # Modular dashboard widgets
│   │   └── App.tsx         # Main dashboard layout
│   └── server/
│       └── index.js        # Node.js API & extraction trigger
└── .venv/                  # Python virtual environment for garmin-cli
```

## 🤝 Contributing
Feel free to submit issues or pull requests to improve the visualizations or add new widgets!

## 📜 License
Apache-2.0
