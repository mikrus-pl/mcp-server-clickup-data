// src/server.js

require('dotenv').config();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

const toolsToRegister = [
  require('./src/tools/listUsersTool'),
  require('./src/tools/getReportedTaskAggregatesTool'),
  require('./src/tools/triggerUserSyncTool'),
  require('./src/tools/triggerTaskSyncTool'),
  require('./src/tools/triggerFullSyncTool'),
  require('./src/tools/purgeDatabaseTool'),
  require('./src/tools/setUserHourlyRateTool'),
  require('./src/tools/listUserHourlyRatesTool'),
  require('./src/tools/deactivateUserHourlyRateTool'),
  require('./src/tools/createInvoiceTool'),
  require('./src/tools/listInvoicesTool'),
];

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'ClickUpDataServer';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

async function main() {
  console.error(`[MCP Server] Initializing server: ${SERVER_NAME} v${SERVER_VERSION}`);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    capabilities: {
      tools: { listChanged: false },
    },
  });

  try {
    console.error('[MCP Server] Registering tools...');
    
    for (const tool of toolsToRegister) {
      console.error(`- Registering tool: ${tool.name}`);

      // Basic validation to ensure the tool module is correctly structured
      if (!tool.name || !tool.description || !(tool.inputSchema instanceof z.ZodObject) || !tool.handler) {
        console.error(`[MCP Server] CRITICAL: Tool module for '${tool.name || 'unknown'}' is malformed. It must export name, description, a ZodObject for inputSchema, and a handler. Skipping.`);
        continue;
      }
      
      // *** THIS IS THE CRITICAL FIX ***
      // Use the correct method signature: tool(name, description, schema, handler)
      server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        tool.handler
      );
    }
    
    console.error('[MCP Server] All tools registered successfully.');

  } catch (regError) {
    console.error('[MCP Server] CRITICAL: Error during tool registration:', regError);
    process.exit(1);
  }
  
  // Handler dla `initialize` jest automatycznie obsługiwany przez McpServer.
  // Handlery dla `tools/list` i `tools/call` SĄ AUTOMATYCZNIE generowane przez McpServer
  // na podstawie narzędzi zarejestrowanych przez `server.tool()`.
  // Dlatego NIE używamy już `server.setRequestHandler(...)` dla tych metod.
  
  const transport = new StdioServerTransport();
  console.error('[MCP Server] Connecting transport...');
  await server.connect(transport);

  console.error(`[MCP Server] ${SERVER_NAME} v${SERVER_VERSION} running and connected via stdio.`);
  console.error('[MCP Server] Waiting for MCP client requests...');
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error during server startup or operation:', error);
  process.exit(1);
});