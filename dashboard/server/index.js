const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '../../garmin_data.db');
const db = new Database(dbPath, { verbose: console.log });

// Read Mapbox token
let mapboxToken = '';
try {
  mapboxToken = fs.readFileSync(path.join(__dirname, '../../mapbox_token'), 'utf8').trim();
} catch (err) {
  console.error('Error reading mapbox_token:', err);
}

app.get('/api/config', (req, res) => {
  res.json({ mapboxToken });
});

app.get('/api/summary', (req, res) => {
  const steps = db.prepare(`
    SELECT date(timestamp) as day, SUM(value) as total_steps 
    FROM steps 
    GROUP BY day 
    ORDER BY day DESC 
    LIMIT 7
  `).all();

  const calories = db.prepare(`
    SELECT date(start_ts) as day, SUM(calories) as active_calories
    FROM activity
    GROUP BY day
    ORDER BY day DESC
    LIMIT 7
  `).all();

  res.json({ steps, calories });
});

app.get('/api/sleep', (req, res) => {
  const latestSleep = db.prepare(`
    SELECT 
      sleep_id, 
      start_ts, 
      sleep_time_seconds as duration, 
      score_overall_value as sleep_score,
      deep_sleep_seconds as deep_sleep_duration,
      light_sleep_seconds as light_sleep_duration,
      rem_sleep_seconds as rem_sleep_duration,
      awake_sleep_seconds as awake_duration
    FROM sleep 
    ORDER BY start_ts DESC 
    LIMIT 7
  `).all();
  
  if (latestSleep.length > 0) {
    const sleepIds = latestSleep.map(s => s.sleep_id);
    const placeholders = sleepIds.map(() => '?').join(',');
    const levels = db.prepare(`
      SELECT * FROM sleep_level WHERE sleep_id IN (${placeholders}) ORDER BY start_ts ASC
    `).all(...sleepIds);
    
    res.json({ sleep: latestSleep, levels });
  } else {
    res.json({ sleep: [], levels: [] });
  }
});

app.get('/api/wellness', (req, res) => {
  const stress = db.prepare(`
    SELECT timestamp, value FROM stress ORDER BY timestamp DESC LIMIT 200
  `).all();
  
  const bodyBattery = db.prepare(`
    SELECT timestamp, value FROM body_battery ORDER BY timestamp DESC LIMIT 200
  `).all();

  const heartRate = db.prepare(`
    SELECT timestamp, value FROM heart_rate ORDER BY timestamp DESC LIMIT 200
  `).all();

  res.json({ stress, bodyBattery, heartRate });
});

app.get('/api/activities', (req, res) => {
  const activities = db.prepare(`
    SELECT 
      a.activity_id,
      a.activity_name,
      a.activity_type_key as activity_type,
      a.start_ts,
      a.duration,
      a.distance,
      a.calories,
      a.max_speed,
      a.average_speed,
      a.average_hr,
      a.max_hr,
      a.aerobic_training_effect,
      a.anaerobic_training_effect,
      a.training_effect_label,
      a.location_name,
      a.ts_data_available,
      r.avg_running_cadence,
      r.max_running_cadence,
      r.elevation_gain as running_elevation_gain,
      r.avg_stride_length,
      c.avg_biking_cadence,
      c.max_biking_cadence,
      c.elevation_gain as cycling_elevation_gain,
      c.avg_power,
      c.max_power,
      c.normalized_power,
      s.avg_swolf,
      s.active_lengths
    FROM activity a
    LEFT JOIN running_agg_metrics r ON a.activity_id = r.activity_id
    LEFT JOIN cycling_agg_metrics c ON a.activity_id = c.activity_id
    LEFT JOIN swimming_agg_metrics s ON a.activity_id = s.activity_id
    WHERE a.activity_type_key IN (
      'running', 'cycling', 'hiking', 'snowboarding', 'skiing', 
      'resort_snowboarding', 'backcountry_skiing_snowboarding', 'treadmill_running',
      'lap_swimming', 'open_water_swimming', 'walking', 'cardio', 'strength_training'
    )
    ORDER BY a.start_ts DESC 
    LIMIT 30
  `).all();
  res.json(activities);
});

app.get('/api/activity/:id/path', (req, res) => {
  const path = db.prepare(`
    SELECT path_json FROM activity_path WHERE activity_id = ?
  `).get(req.params.id);
  
  if (path) {
    res.json(JSON.parse(path.path_json));
  } else {
    res.status(404).json({ error: 'Path not found' });
  }
});

app.get('/api/biometrics', (req, res) => {
  const vo2 = db.prepare(`
    SELECT date as day, vo2_max_generic as vo2_max 
    FROM vo2_max 
    WHERE vo2_max_generic IS NOT NULL 
    ORDER BY date DESC LIMIT 30
  `).all();
  
  const weight = db.prepare(`
    SELECT date(create_ts) as day, weight / 1000.0 as weight 
    FROM user_profile 
    WHERE weight IS NOT NULL 
    ORDER BY day DESC LIMIT 30
  `).all();

  res.json({ vo2, weight });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
