const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, '../../garmin_data.db');
const db = new Database(dbPath, { verbose: console.log });

// Ollama configuration (direct connection, bypassing LiteLLM which strips tool_calls)
const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'glm-4.7-flash';

// Helper: call Ollama's /api/chat endpoint
async function ollamaChat(model, messages, tools = null) {
  const body = {
    model,
    messages,
    stream: false,
  };
  if (tools) body.tools = tools;

  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Ollama error ${resp.status}: ${text}`);
  }
  return resp.json();
}

// Helper: fetch available Ollama models
async function getOllamaModels() {
  const resp = await fetch(`${OLLAMA_URL}/api/tags`);
  if (!resp.ok) return [];
  const data = await resp.json();
  return (data.models || []).map(m => ({
    name: m.name,
    size: m.size,
    parameterSize: m.details?.parameter_size || null,
    family: m.details?.family || null,
  }));
}

// Read Mapbox token
let mapboxToken = '';
try {
  mapboxToken = fs.readFileSync(path.join(__dirname, '../../mapbox_token'), 'utf8').trim();
} catch (err) {
  console.error('Error reading mapbox_token:', err);
}

// ---- Direct SQLite Tool Implementation (replaces MCP server-sqlite) ----
// Execute a read-only SQL query against the Garmin database
function executeReadQuery(sql) {
  // Security: only allow SELECT statements
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith('SELECT')) {
    return { error: 'Only SELECT queries are allowed.' };
  }
  try {
    const rows = db.prepare(sql).all();
    return { rows, rowCount: rows.length };
  } catch (err) {
    return { error: err.message };
  }
}

// Get the database schema
function getSchema() {
  try {
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();
    const schema = {};
    for (const { name } of tables) {
      const columns = db.prepare(`PRAGMA table_info('${name}')`).all();
      schema[name] = columns.map(c => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull,
        pk: c.pk
      }));
    }
    return schema;
  } catch (err) {
    return { error: err.message };
  }
}

// Tool definitions exposed to the LLM (Ollama format)
const ollamaTools = [
  {
    type: 'function',
    function: {
      name: 'read_query',
      description: 'Execute a read-only SQL query against the Garmin health database. Only SELECT statements are permitted.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The SQL SELECT query to execute.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_tables',
      description: 'List all tables in the Garmin health database with their column schemas.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  }
];

// Dispatch a tool call to the appropriate handler
function handleToolCall(name, args) {
  switch (name) {
    case 'read_query':
      return executeReadQuery(args.query);
    case 'list_tables':
      return getSchema();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

console.log('SQLite tools ready (direct integration, no MCP subprocess)');

app.get('/api/config', (req, res) => {
  res.json({ mapboxToken });
});

// List available Ollama models
app.get('/api/models', async (req, res) => {
  try {
    const models = await getOllamaModels();
    res.json({ models, default: DEFAULT_MODEL });
  } catch {
    res.json({ models: [], default: DEFAULT_MODEL });
  }
});

// Health check for the AI assistant subsystem
app.get('/api/chat/status', async (req, res) => {
  try {
    const models = await getOllamaModels();
    res.json({
      status: models.length > 0 ? 'online' : 'offline',
      model: DEFAULT_MODEL,
      models,
    });
  } catch {
    res.json({ status: 'offline', model: DEFAULT_MODEL, models: [] });
  }
});

app.post('/api/refresh', (req, res) => {
  console.log('Starting Garmin data extraction...');
  const garminCmd = path.join(__dirname, '../../.venv/bin/garmin');
  const dbFile = path.join(__dirname, '../../garmin_data.db');
  
  exec(`${garminCmd} extract --db-path ${dbFile}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing garmin extract: ${error}`);
      return res.status(500).json({ error: error.message, details: stderr });
    }
    console.log('Garmin extraction successful');
    res.json({ message: 'Sync successful', output: stdout });
  });
});

// AI Assistant Endpoint (Ollama direct + SQLite tools)
app.post('/api/chat', async (req, res) => {
  const { messages, model: requestedModel } = req.body;
  const model = requestedModel || DEFAULT_MODEL;

  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayISO = now.toISOString().split('T')[0];

  // Compute UTC offset for timezone conversion instructions
  // getTimezoneOffset() returns minutes *behind* UTC, so we negate it
  const offsetMin = -now.getTimezoneOffset();
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const offsetHours = Math.floor(Math.abs(offsetMin) / 60);
  const offsetMins = Math.abs(offsetMin) % 60;
  const utcOffset = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  const localTimeNow = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const systemPrompt = `You are a helpful Garmin Health Assistant. You have access to a local SQLite database containing the user's health and fitness data via tools.
Today's date is ${today}. The current local time is ${localTimeNow}.

IMPORTANT — Timezone:
- All timestamps in the database are stored in **UTC**.
- The user's local timezone is **UTC${utcOffset}** (${offsetHours} hours ahead of UTC).
- When displaying times to the user, you MUST convert UTC timestamps by adding ${offsetHours} hours${offsetMins > 0 ? ` and ${offsetMins} minutes` : ''}.
- Example: a database timestamp of "2026-04-10 19:42:00" (UTC) → "2026-04-11 00:42:00" (local time, ${utcOffset}).
- You can also convert in SQL: datetime(start_ts, '+${offsetHours} hours') to get local times directly.

Database Schema Overview:
- activity: main activity records (activity_id, activity_name, activity_type_key, start_ts, duration, distance, calories, average_hr, max_hr, aerobic_training_effect, anaerobic_training_effect, training_effect_label, location_name).
- sleep: main sleep sessions (sleep_id, start_ts, end_ts, sleep_time_seconds, score_overall_value as sleep_score, deep_sleep_seconds, light_sleep_seconds, rem_sleep_seconds, awake_sleep_seconds, average_spo2, hrv_status, resting_heart_rate).
- stress: 3-min interval stress levels (timestamp, value).
- body_battery: 3-min interval energy levels (timestamp, value).
- heart_rate: 2-min interval heart rate readings (timestamp, value).
- steps: 15-min interval step counts (timestamp, value).
- vo2_max: VO2 max measurements (date, vo2_max_generic).
- user_profile: user settings and traits (gender, weight in grams, height in cm).

Guidelines:
1. Use the 'read_query' tool to query data if needed to answer the user's question.
2. Only use read-only SELECT statements.
3. If the query returns a large amount of data, summarize it for the user.
4. When querying for dates, remember today is ${todayISO} (local date).
5. You can use 'list_tables' to discover the full database schema if needed.
6. Be concise and friendly. Format numbers nicely (e.g. hours:minutes for durations).
7. Always present times in the user's local timezone, never in raw UTC.
`;

  try {
    let currentMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    // 1. Initial call to LLM via Ollama
    let result = await ollamaChat(model, currentMessages, ollamaTools);
    let assistantMsg = result.message;

    // 2. Handle Tool Calls (supports multiple rounds)
    let maxRounds = 5;
    while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && maxRounds-- > 0) {
      // Add the assistant message (with tool_calls) to conversation
      currentMessages.push({
        role: 'assistant',
        content: assistantMsg.content || '',
        tool_calls: assistantMsg.tool_calls,
      });

      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;
        
        console.log(`Executing Tool: ${toolName}`, toolArgs);
        
        const toolResult = handleToolCall(toolName, toolArgs);
        
        // Ollama expects tool results in this format
        currentMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
        });
      }

      // 3. Follow-up call to model with tool results
      result = await ollamaChat(model, currentMessages, ollamaTools);
      assistantMsg = result.message;
    }

    res.json({ role: 'assistant', content: assistantMsg.content || '(No response from the model)' });
  } catch (error) {
    console.error('AI Chat Error:', error?.message || error);
    res.status(500).json({ error: 'Failed to communicate with AI assistant', details: error?.message });
  }
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
