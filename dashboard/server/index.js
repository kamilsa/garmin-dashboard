const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const dbPath = path.join(__dirname, '../../garmin_data.db');
const db = new Database(dbPath, { verbose: console.log });

// ---- MCP Client Connection ----
let mcpClient = null;
let mcpTools = [];
let mcpConnected = false;

async function connectMCP() {
  try {
    const transport = new StdioClientTransport({
      command: 'node',
      args: [path.join(__dirname, 'mcp-server.js')],
    });

    mcpClient = new Client({
      name: 'garmin-dashboard-server',
      version: '1.0.0',
    });

    await mcpClient.connect(transport);
    mcpConnected = true;
    console.log('Connected to Garmin Health MCP Server');

    // Fetch available tools from MCP server
    const toolsResult = await mcpClient.listTools();
    mcpTools = toolsResult.tools.map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
    console.log('MCP tools loaded:', mcpTools.map(t => t.function.name));
  } catch (err) {
    console.error('Failed to connect to MCP server, falling back to direct SQLite tools:', err.message);
    mcpConnected = false;
  }
}

// Initialize MCP connection on startup
connectMCP();

// ---- Conversation Memory (SQLite-backed) ----
// Create memory table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ---- Food Log (image-based nutrition tracking) ----
db.exec(`
  CREATE TABLE IF NOT EXISTS food_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    food_name TEXT NOT NULL,
    description TEXT,
    calories REAL,
    protein_g REAL,
    carbs_g REAL,
    fat_g REAL,
    fiber_g REAL,
    serving_description TEXT,
    confidence TEXT,
    raw_analysis TEXT,
    image_thumbnail TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function getMemoryMessages(limit = 50) {
  return db.prepare(
    'SELECT role, content FROM chat_memory ORDER BY id DESC LIMIT ?'
  ).all(limit).reverse();
}

function saveMemoryMessage(role, content) {
  db.prepare('INSERT INTO chat_memory (role, content) VALUES (?, ?)').run(role, content);
}

function clearMemory() {
  db.prepare('DELETE FROM chat_memory').run();
}

// Ollama configuration (direct connection, bypassing LiteLLM which strips tool_calls)
const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'glm-4.7-flash';

// Helper: call Ollama's /api/chat endpoint
async function ollamaChat(model, messages, tools = null, signal = null) {
  const body = {
    model,
    messages,
    stream: false,
  };
  if (tools) body.tools = tools;

  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
  if (signal) fetchOptions.signal = signal;

  const resp = await fetch(`${OLLAMA_URL}/api/chat`, fetchOptions);
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

// ---- Tool Handling (MCP-first with fallback to direct SQLite) ----

// Fallback direct SQLite tools (used when MCP is unavailable)
function executeReadQuery(sql) {
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

// Fallback tool definitions (Ollama format) for when MCP is not connected
const fallbackTools = [
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
  },
  {
    type: 'function',
    function: {
      name: 'food_summary',
      description: 'Get a summary of food intake for a specific date or date range. Returns total calories, protein, carbs, fat, and individual food entries.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look back (default: 1 for today)'
          },
          date: {
            type: 'string',
            description: 'Specific date in YYYY-MM-DD format'
          }
        },
        required: []
      }
    }
  }
];

// Get the active tools (MCP or fallback)
function getActiveTools() {
  return mcpConnected && mcpTools.length > 0 ? mcpTools : fallbackTools;
}

// Dispatch a tool call — uses MCP if connected, falls back to direct SQLite
async function handleToolCall(name, args) {
  if (mcpConnected && mcpClient) {
    try {
      const result = await mcpClient.callTool({ name, arguments: args });
      // MCP returns content array; extract text
      const textContent = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      return JSON.parse(textContent);
    } catch (err) {
      console.error(`MCP tool call failed for ${name}, falling back:`, err.message);
      // Fall through to direct implementation
    }
  }
  // Fallback: direct SQLite
  switch (name) {
    case 'read_query':
      return executeReadQuery(args.query);
    case 'list_tables':
      return getSchema();
    case 'food_summary':
      return getFoodSummary(args);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

console.log(`Tools ready (${mcpConnected ? 'MCP server' : 'direct SQLite fallback'})`);

// ---- Food Summary Helper ----
function getFoodSummary({ days, date }) {
  try {
    let entries, summary;
    if (date) {
      entries = db.prepare(
        "SELECT * FROM food_log WHERE date(created_at) = ? ORDER BY created_at DESC"
      ).all(date);
      summary = db.prepare(
        "SELECT SUM(calories) as total_calories, SUM(protein_g) as total_protein, SUM(carbs_g) as total_carbs, SUM(fat_g) as total_fat, COUNT(*) as entry_count FROM food_log WHERE date(created_at) = ?"
      ).get(date);
    } else {
      const lookback = days || 1;
      entries = db.prepare(
        "SELECT * FROM food_log WHERE created_at >= datetime('now', ? || ' days') ORDER BY created_at DESC"
      ).all(-lookback);
      summary = db.prepare(
        "SELECT SUM(calories) as total_calories, SUM(protein_g) as total_protein, SUM(carbs_g) as total_carbs, SUM(fat_g) as total_fat, COUNT(*) as entry_count FROM food_log WHERE created_at >= datetime('now', ? || ' days')"
      ).get(-lookback);
    }
    return { summary, entries };
  } catch (err) {
    return { error: err.message };
  }
}

// ---- Food Analysis Prompt ----
const FOOD_ANALYSIS_PROMPT = `You are a nutrition analysis AI. Analyze the food in this image and provide a detailed nutritional breakdown.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "food_name": "Name of the food",
  "description": "Brief description of what you see",
  "calories": 0,
  "protein_g": 0,
  "carbs_g": 0,
  "fat_g": 0,
  "fiber_g": 0,
  "serving_description": "Estimated serving size",
  "confidence": "high|medium|low"
}

If you cannot identify the food or estimate nutrition, set confidence to "low" and provide your best estimate with zeros for unknown values.`;

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

// AI Assistant Endpoint (Ollama direct + MCP/SQLite tools + Memory)
app.post('/api/chat', async (req, res) => {
  const { messages, model: requestedModel, memoryEnabled } = req.body;
  const model = requestedModel || DEFAULT_MODEL;

  // Setup abort controller mapped to the client request
  const ac = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      ac.abort();
    }
  });

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
- food_log: food tracking entries from image analysis (food_name, description, calories, protein_g, carbs_g, fat_g, fiber_g, serving_description, confidence, created_at). Query this to answer questions about nutrition, diet, or to cross-reference with activity data.

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
    // Build message list: system prompt + memory (if enabled) + current conversation
    let currentMessages = [
      { role: 'system', content: systemPrompt },
    ];

    // Prepend memory messages if memory is enabled
    if (memoryEnabled) {
      const memoryMsgs = getMemoryMessages(50);
      if (memoryMsgs.length > 0) {
        currentMessages.push({
          role: 'system',
          content: `[Conversation Memory — previous messages from this session and earlier sessions. Use this context to maintain continuity.]\n${memoryMsgs.map(m => `${m.role}: ${m.content}`).join('\n')}`,
        });
      }
    }

    currentMessages.push(...messages.map(m => ({
      role: m.role,
      content: m.content
    })));

    // 1. Initial call to LLM via Ollama
    let result = await ollamaChat(model, currentMessages, getActiveTools(), ac.signal);
    let assistantMsg = result.message;

    // 2. Handle Tool Calls (supports multiple rounds)
    let maxRounds = 5;
    while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && maxRounds-- > 0) {
      if (ac.signal.aborted) break;
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
        
        const toolResult = await handleToolCall(toolName, toolArgs);
        
        // Ollama expects tool results in this format
        currentMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
        });
      }

      // 3. Follow-up call to model with tool results
      result = await ollamaChat(model, currentMessages, getActiveTools(), ac.signal);
      assistantMsg = result.message;
    }

    if (ac.signal.aborted) {
      return res.status(499).json({ error: 'Client Closed Request' });
    }

    // Save messages to memory if memory is enabled
    if (memoryEnabled) {
      for (const m of messages) {
        saveMemoryMessage(m.role, m.content);
      }
      saveMemoryMessage('assistant', assistantMsg.content || '');
    }

    res.json({ role: 'assistant', content: assistantMsg.content || '(No response from the model)' });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Ollama request aborted by user');
      return res.status(499).json({ error: 'Request aborted' });
    }
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
    LIMIT 500
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

app.get('/api/activity/:id/ts', (req, res) => {
  const tsData = db.prepare(`
    SELECT 
      timestamp,
      MAX(CASE WHEN name = 'heart_rate' THEN value END) as hr,
      MAX(CASE WHEN name = 'enhanced_speed' THEN value END) as speed,
      MAX(CASE WHEN name = 'power' THEN value END) as power,
      MAX(CASE WHEN name = 'stance_time' THEN value END) as gct,
      MAX(CASE WHEN name = 'vertical_ratio' THEN value END) as vr,
      MAX(CASE WHEN name = 'step_length' THEN value END) as step_length
    FROM activity_ts_metric 
    WHERE activity_id = ? 
    GROUP BY timestamp 
    ORDER BY timestamp ASC
  `).all(req.params.id);

  const targetPoints = 300;
  let downsampled = tsData;
  if (tsData.length > targetPoints) {
    const step = Math.ceil(tsData.length / targetPoints);
    downsampled = tsData.filter((_, index) => index % step === 0);
  }

  const processed = downsampled.map(d => {
    let pace = null;
    if (d.speed > 0) {
      pace = 1000 / (d.speed * 60);
      if (pace > 20) pace = 20;
    }
    return { ...d, pace };
  });

  res.json(processed);
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

app.get('/api/fitness-age', (req, res) => {
  // Garmin fitness age lookup: VO2 Max → fitness age
  // Source: Based on Garmin Connect / ACSM published norms (male reference)
  // Entries: [minVO2, maxVO2, fitnessAge]
  const fitnessAgeMale = [
    [56.9, Infinity, 20], [54.9, 56.8, 21], [52.9, 54.8, 22], [50.9, 52.8, 23],
    [49.4, 50.8, 24], [47.9, 49.3, 25], [46.4, 47.8, 26], [44.9, 46.3, 27],
    [43.4, 44.8, 28], [41.9, 43.3, 29], [40.9, 41.8, 30], [39.9, 40.8, 31],
    [38.9, 39.8, 32], [37.9, 38.8, 33], [36.9, 37.8, 34], [35.9, 36.8, 35],
    [34.9, 35.8, 36], [33.9, 34.8, 37], [32.9, 33.8, 38], [31.9, 32.8, 39],
    [30.9, 31.8, 40], [29.9, 30.8, 41], [28.9, 29.8, 42], [27.9, 28.8, 43],
    [26.9, 27.8, 44], [25.9, 26.8, 45], [24.9, 25.8, 46], [23.9, 24.8, 47],
    [22.9, 23.8, 48], [0, 22.8, 49],
  ];
  const fitnessAgeFemale = [
    [52.9, Infinity, 20], [50.9, 52.8, 21], [48.9, 50.8, 22], [46.9, 48.8, 23],
    [44.9, 46.8, 24], [42.9, 44.8, 25], [41.4, 42.8, 26], [39.9, 41.3, 27],
    [38.4, 39.8, 28], [36.9, 38.3, 29], [35.9, 36.8, 30], [34.9, 35.8, 31],
    [33.9, 34.8, 32], [32.9, 33.8, 33], [31.9, 32.8, 34], [30.9, 31.8, 35],
    [29.9, 30.8, 36], [28.9, 29.8, 37], [27.9, 28.8, 38], [26.9, 27.8, 39],
    [25.9, 26.8, 40], [24.9, 25.8, 41], [23.9, 24.8, 42], [22.9, 23.8, 43],
    [21.9, 22.8, 44], [20.9, 21.8, 45], [19.9, 20.8, 46], [18.9, 19.8, 47],
    [17.9, 18.8, 48], [0, 17.8, 49],
  ];

  try {
    const user = db.prepare('SELECT birth_date FROM user LIMIT 1').get();
    const profile = db.prepare('SELECT gender FROM user_profile WHERE latest = 1 LIMIT 1').get();
    const vo2Rows = db.prepare(`
      SELECT date as day, vo2_max_generic as vo2_max 
      FROM vo2_max 
      WHERE vo2_max_generic IS NOT NULL 
      ORDER BY date DESC LIMIT 30
    `).all();

    if (!user || !vo2Rows.length) {
      return res.status(404).json({ error: 'Insufficient data' });
    }

    const currentVO2 = vo2Rows[0].vo2_max;
    const gender = profile?.gender || 'male';
    const table = gender === 'female' ? fitnessAgeFemale : fitnessAgeMale;

    const entry = table.find(([min, max]) => currentVO2 >= min && currentVO2 <= max);
    const fitnessAge = entry ? entry[2] : 49;

    // Real age from birth_date
    const birthDate = new Date(user.birth_date);
    const today = new Date();
    let realAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) realAge--;

    const ageDelta = realAge - fitnessAge; // positive = younger fitness age

    // VO2 trend: compare latest vs 30 days ago
    const oldestVO2 = vo2Rows.length > 1 ? vo2Rows[vo2Rows.length - 1].vo2_max : currentVO2;
    const trend = currentVO2 - oldestVO2;

    // History for sparkline (fitness age over time)
    const history = vo2Rows.slice(0, 15).reverse().map(row => {
      const e = table.find(([min, max]) => row.vo2_max >= min && row.vo2_max <= max);
      return { day: row.day, fitnessAge: e ? e[2] : 49, vo2Max: row.vo2_max };
    });

    res.json({
      fitnessAge,
      realAge,
      ageDelta,
      currentVO2,
      trend: parseFloat(trend.toFixed(1)),
      updatedAt: vo2Rows[0].day,
      history,
      gender,
    });
  } catch (error) {
    console.error('Fitness age error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---- Memory API Endpoints ----

// Get memory status and recent messages
app.get('/api/chat/memory', (req, res) => {
  try {
    const messages = getMemoryMessages(50);
    res.json({ enabled: true, messageCount: messages.length, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all conversation memory
app.delete('/api/chat/memory', (req, res) => {
  try {
    clearMemory();
    res.json({ success: true, message: 'Memory cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get MCP server status
app.get('/api/chat/mcp-status', (req, res) => {
  res.json({
    connected: mcpConnected,
    tools: mcpConnected ? mcpTools.map(t => t.function.name) : fallbackTools.map(t => t.function.name),
    source: mcpConnected ? 'mcp' : 'direct-sqlite',
  });
});

// ---- Food Tracker Endpoints ----

// Analyze a food image using an Ollama vision model and store the result
app.post('/api/food/analyze', async (req, res) => {
  const { image, model, thumbnail } = req.body;

  if (!image || !model) {
    return res.status(400).json({ error: 'image and model are required' });
  }

  // Guard against very large payloads (~10MB base64)
  if (image.length > 10 * 1024 * 1024) {
    return res.status(413).json({ error: 'Image too large, maximum 10MB' });
  }

  const ac = new AbortController();
  res.on('close', () => { if (!res.writableEnded) ac.abort(); });

  try {
    const messages = [{
      role: 'user',
      content: FOOD_ANALYSIS_PROMPT,
      images: [image],
    }];

    const result = await ollamaChat(model, messages, null, ac.signal);
    const rawText = result.message?.content || '';

    // Parse the JSON response (strip markdown fences if present)
    let nutritionData;
    try {
      const cleaned = rawText.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
      nutritionData = JSON.parse(cleaned);
    } catch {
      // Parsing failed — store raw text, mark low confidence
      nutritionData = {
        food_name: 'Unknown food',
        description: null,
        calories: null,
        protein_g: null,
        carbs_g: null,
        fat_g: null,
        fiber_g: null,
        serving_description: null,
        confidence: 'low',
      };
    }

    const stmt = db.prepare(`
      INSERT INTO food_log (food_name, description, calories, protein_g, carbs_g, fat_g, fiber_g, serving_description, confidence, raw_analysis, image_thumbnail)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      nutritionData.food_name || 'Unknown food',
      nutritionData.description || null,
      nutritionData.calories != null ? Number(nutritionData.calories) : null,
      nutritionData.protein_g != null ? Number(nutritionData.protein_g) : null,
      nutritionData.carbs_g != null ? Number(nutritionData.carbs_g) : null,
      nutritionData.fat_g != null ? Number(nutritionData.fat_g) : null,
      nutritionData.fiber_g != null ? Number(nutritionData.fiber_g) : null,
      nutritionData.serving_description || null,
      nutritionData.confidence || 'low',
      rawText,
      thumbnail || null
    );

    const entry = db.prepare('SELECT * FROM food_log WHERE id = ?').get(info.lastInsertRowid);
    res.json(entry);
  } catch (err) {
    if (err.name === 'AbortError') return res.status(499).json({ error: 'Request cancelled' });
    console.error('Food analysis error:', err);
    res.status(502).json({ error: 'AI service error', details: err.message });
  }
});

// Get food log entries with daily totals
app.get('/api/food', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 50;

    const entries = db.prepare(`
      SELECT * FROM food_log
      WHERE created_at >= datetime('now', ? || ' days')
      ORDER BY created_at DESC
      LIMIT ?
    `).all(-days, limit);

    const totals = db.prepare(`
      SELECT date(created_at) as day,
             SUM(calories) as total_calories,
             SUM(protein_g) as total_protein,
             SUM(carbs_g) as total_carbs,
             SUM(fat_g) as total_fat,
             COUNT(*) as entry_count
      FROM food_log
      WHERE created_at >= datetime('now', ? || ' days')
      GROUP BY day
      ORDER BY day DESC
    `).all(-days);

    res.json({ entries, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a food log entry
app.patch('/api/food/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM food_log WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Food entry not found' });
    }

    const allowedFields = new Set([
      'food_name',
      'description',
      'calories',
      'protein_g',
      'carbs_g',
      'fat_g',
      'fiber_g',
      'serving_description',
      'confidence',
    ]);

    const payloadKeys = Object.keys(req.body || {});
    if (payloadKeys.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const unknownFields = payloadKeys.filter(key => !allowedFields.has(key));
    if (unknownFields.length > 0) {
      return res.status(400).json({ error: `Unknown fields: ${unknownFields.join(', ')}` });
    }

    const toNullableText = (value) => {
      if (value == null) return null;
      const text = String(value).trim();
      return text.length > 0 ? text : null;
    };

    const toNullableNumber = (value, field) => {
      if (value == null || value === '') return null;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`${field} must be a valid number`);
      }
      return parsed;
    };

    const next = {
      food_name: existing.food_name,
      description: existing.description,
      calories: existing.calories,
      protein_g: existing.protein_g,
      carbs_g: existing.carbs_g,
      fat_g: existing.fat_g,
      fiber_g: existing.fiber_g,
      serving_description: existing.serving_description,
      confidence: existing.confidence,
    };

    if (payloadKeys.includes('food_name')) {
      const name = toNullableText(req.body.food_name);
      if (!name) {
        return res.status(400).json({ error: 'food_name cannot be empty' });
      }
      next.food_name = name;
    }

    if (payloadKeys.includes('description')) {
      next.description = toNullableText(req.body.description);
    }

    if (payloadKeys.includes('serving_description')) {
      next.serving_description = toNullableText(req.body.serving_description);
    }

    if (payloadKeys.includes('confidence')) {
      const confidence = toNullableText(req.body.confidence);
      if (confidence && !['low', 'medium', 'high'].includes(confidence.toLowerCase())) {
        return res.status(400).json({ error: 'confidence must be low, medium, or high' });
      }
      next.confidence = confidence ? confidence.toLowerCase() : null;
    }

    if (payloadKeys.includes('calories')) {
      next.calories = toNullableNumber(req.body.calories, 'calories');
    }

    if (payloadKeys.includes('protein_g')) {
      next.protein_g = toNullableNumber(req.body.protein_g, 'protein_g');
    }

    if (payloadKeys.includes('carbs_g')) {
      next.carbs_g = toNullableNumber(req.body.carbs_g, 'carbs_g');
    }

    if (payloadKeys.includes('fat_g')) {
      next.fat_g = toNullableNumber(req.body.fat_g, 'fat_g');
    }

    if (payloadKeys.includes('fiber_g')) {
      next.fiber_g = toNullableNumber(req.body.fiber_g, 'fiber_g');
    }

    db.prepare(`
      UPDATE food_log
      SET food_name = ?, description = ?, calories = ?, protein_g = ?, carbs_g = ?, fat_g = ?, fiber_g = ?, serving_description = ?, confidence = ?
      WHERE id = ?
    `).run(
      next.food_name,
      next.description,
      next.calories,
      next.protein_g,
      next.carbs_g,
      next.fat_g,
      next.fiber_g,
      next.serving_description,
      next.confidence,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM food_log WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a food log entry
app.delete('/api/food/:id', (req, res) => {
  try {
    const info = db.prepare('DELETE FROM food_log WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Food entry not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global JSON/body parser error handler
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image payload too large. Please upload a smaller image.' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
