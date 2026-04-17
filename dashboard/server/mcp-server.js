/**
 * MCP Server for Garmin Health Database
 *
 * Exposes SQLite database tools via the Model Context Protocol (MCP).
 * This server runs as a child process (stdio transport) and provides:
 *   - read_query: Execute read-only SQL queries
 *   - list_tables: Get the database schema
 *
 * The Express server connects to this MCP server and uses its tools
 * when processing chat requests from the AI assistant.
 */

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const Database = require('better-sqlite3');
const path = require('path');
const { z } = require('zod');

// Database path — same as the main server
const dbPath = path.join(__dirname, '../../garmin_data.db');
const db = new Database(dbPath, { verbose: console.log });

// Create MCP server
const server = new McpServer({
  name: 'garmin-health-db',
  version: '1.0.0',
});

// Tool: Execute a read-only SQL query
server.tool(
  'read_query',
  'Execute a read-only SQL query against the Garmin health database. Only SELECT statements are permitted. Use this to answer questions about the user\'s health data, activities, sleep, stress, heart rate, steps, body battery, and more.',
  { query: z.string().describe('The SQL SELECT query to execute.') },
  ({ query }) => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed.startsWith('SELECT')) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: 'Only SELECT queries are allowed.' }) }],
        isError: true,
      };
    }
    try {
      const rows = db.prepare(query).all();
      return {
        content: [{ type: 'text', text: JSON.stringify({ rows, rowCount: rows.length }) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  }
);

// Tool: List all tables and their schemas
server.tool(
  'list_tables',
  'List all tables in the Garmin health database with their column schemas. Use this to discover what data is available before writing queries.',
  {},
  () => {
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
          pk: c.pk,
        }));
      }
      return {
        content: [{ type: 'text', text: JSON.stringify(schema) }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  }
);

// Start the server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Garmin Health MCP Server running on stdio');
}

main().catch((err) => {
  console.error('MCP Server error:', err);
  process.exit(1);
});
