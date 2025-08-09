// src/server.js

require('dotenv').config();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Tool paths to load
const toolPaths = [
  './src/tools/listUsersTool',
  './src/tools/triggerUserSyncTool',
  './src/tools/triggerTaskSyncTool',
  './src/tools/triggerFullSyncTool',
  './src/tools/purgeDatabaseTool',
  './src/tools/setUserHourlyRateTool',
  './src/tools/listUserHourlyRatesTool',
  './src/tools/deactivateUserHourlyRateTool',
  './src/tools/createInvoiceTool',
  './src/tools/listInvoicesTool',
];

// Import the getReportedTaskAggregatesTool directly
const getReportedTaskAggregatesTool = require('./src/tools/getReportedTaskAggregatesTool');

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'ClickUpDataServer';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

// Helper function to validate JSON Schema
function validateJsonSchema(schema, toolName) {
  // Check if it's a Zod object (not allowed)
  if (schema && schema._def) {
    console.error(`  ✗ ERROR: Tool '${toolName}' uses Zod object instead of JSON Schema!`);
    console.error(`    Zod objects are not supported by MCP SDK.`);
    console.error(`    Please convert to JSON Schema format.`);
    return false;
  }
  
  // Check basic structure
  if (!schema || typeof schema !== 'object') {
    console.error(`  ✗ ERROR: Schema is not an object`);
    return false;
  }
  
  // Check for required 'type' property
  if (!schema.type) {
    console.error(`  ⚠ WARNING: Schema missing 'type' property`);
  }
  
  // For object schemas, check properties
  if (schema.type === 'object') {
    if (!schema.properties) {
      console.error(`  ⚠ WARNING: Object schema missing 'properties'`);
    } else {
      const propCount = Object.keys(schema.properties).length;
      console.error(`  ✓ Schema has ${propCount} properties defined`);
      
      // List properties with their types
      for (const [propName, propDef] of Object.entries(schema.properties)) {
        const propType = propDef.type || 'unknown';
        const isRequired = schema.required && schema.required.includes(propName);
        const optionalText = isRequired ? 'required' : 'optional';
        console.error(`    - ${propName}: ${propType} (${optionalText})`);
        if (propDef.description) {
          console.error(`      Description: ${propDef.description}`);
        }
        if (propDef.default !== undefined) {
          console.error(`      Default: ${propDef.default}`);
        }
      }
    }
    
    // Check for additionalProperties
    if (schema.additionalProperties !== false) {
      console.error(`  ⚠ WARNING: Consider setting additionalProperties: false`);
    }
  }
  
  return true;
}

async function main() {
  console.error(`[MCP Server] Initializing server: ${SERVER_NAME} v${SERVER_VERSION}`);
  console.error(`[MCP Server] =================================================`);
  
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    capabilities: {
      tools: { listChanged: false },
    },
  });

  try {
    // Load tools with error handling
    console.error('[MCP Server] Loading tools...');
    const toolsToRegister = [];
    
    for (const toolPath of toolPaths) {
      try {
        const tool = require(toolPath);
        toolsToRegister.push(tool);
        console.error(`[MCP Server] ✓ Successfully loaded: ${tool.name || 'unknown'}`);
      } catch (error) {
        console.error(`[MCP Server] ✗ ERROR loading ${toolPath}:`, error.message);
      }
    }
    
    console.error(`[MCP Server] =================================================`);
    console.error('[MCP Server] Registering tools with server...');
    
    let successCount = 0;
    let failCount = 0;
    
    // Register dynamically loaded tools
    for (const tool of toolsToRegister) {
      console.error(`\n[MCP Server] Processing tool: ${tool.name}`);
      console.error(`  Description: ${tool.description?.substring(0, 80)}...`);
      
      // Validate tool structure
      if (!tool.name || !tool.description || !tool.inputSchema || !tool.handler) {
        console.error(`  ✗ ERROR: Tool is missing required properties`);
        console.error(`    Required: name, description, inputSchema, handler`);
        console.error(`    Found: ${Object.keys(tool).join(', ')}`);
        failCount++;
        continue;
      }
      
      // Validate input schema
      console.error(`  Validating schema...`);
      if (!validateJsonSchema(tool.inputSchema, tool.name)) {
        console.error(`  ✗ ERROR: Invalid schema, skipping tool`);
        failCount++;
        continue;
      }
      
      // Try to register the tool
      try {
        server.tool(
          tool.name,
          tool.description,
          tool.inputSchema,
          tool.handler
        );
        console.error(`  ✓ Tool registered successfully!`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ ERROR registering tool: ${error.message}`);
        failCount++;
      }
    }
    
    // Register explicitly defined tools
    const explicitlyDefinedTools = [
      {
        ...getReportedTaskAggregatesTool,
        // Wrap the handler to properly extract arguments from the request params
        handler: async (params) => {
          // Extract the arguments from the params object
          const args = params && typeof params === 'object' && params.arguments ? params.arguments : {};
          // Log the received parameters for debugging
          console.error(`[MCP Server] getReportedTaskAggregates called with params:`, JSON.stringify(params, null, 2));
          console.error(`[MCP Server] Extracted args:`, JSON.stringify(args, null, 2));
          // Call the original handler with the extracted arguments
          return await getReportedTaskAggregatesTool.handler(args);
        }
      }
    ];
    
    for (const tool of explicitlyDefinedTools) {
      console.error(`\n[MCP Server] Processing explicitly defined tool: ${tool.name}`);
      console.error(`  Description: ${tool.description?.substring(0, 80)}...`);
      
      // Validate tool structure
      if (!tool.name || !tool.description || !tool.inputSchema || !tool.handler) {
        console.error(`  ✗ ERROR: Tool is missing required properties`);
        console.error(`    Required: name, description, inputSchema, handler`);
        console.error(`    Found: ${Object.keys(tool).join(', ')}`);
        failCount++;
        continue;
      }
      
      // Validate input schema
      console.error(`  Validating schema...`);
      if (!validateJsonSchema(tool.inputSchema, tool.name)) {
        console.error(`  ✗ ERROR: Invalid schema, skipping tool`);
        failCount++;
        continue;
      }
      
      // Try to register the tool
      try {
        server.tool(
          tool.name,
          tool.description,
          tool.inputSchema,
          tool.handler
        );
        console.error(`  ✓ Tool registered successfully!`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ ERROR registering tool: ${error.message}`);
        failCount++;
      }
    }
    
    console.error(`\n[MCP Server] =================================================`);
    console.error(`[MCP Server] Registration complete:`);
    console.error(`[MCP Server]   ✓ Successful: ${successCount} tools`);
    console.error(`[MCP Server]   ✗ Failed: ${failCount} tools`);
    console.error(`[MCP Server] =================================================`);

    if (successCount === 0) {
      throw new Error('No tools were successfully registered!');
    }

  } catch (regError) {
    console.error('[MCP Server] CRITICAL: Error during tool registration:', regError);
    process.exit(1);
  }
  
  // Connect transport
  const transport = new StdioServerTransport();
  console.error('\n[MCP Server] Connecting transport...');
  await server.connect(transport);

  console.error(`[MCP Server] ${SERVER_NAME} v${SERVER_VERSION} is running`);
  console.error('[MCP Server] Ready to handle MCP client requests');
  console.error('[MCP Server] =================================================\n');
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error during server startup:', error);
  process.exit(1);
});