require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: listUserHourlyRates] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'listUserHourlyRates',
  description: 'Lists all hourly rates for a specific user in the ClickUp Data Collector application. Returns all rates with their effective date ranges.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'integer',
        description: 'The ClickUp User ID (numeric) for whom to list the rates.'
      }
    },
    required: ['userId']
  },
  handler: async (args) => {
    // Manual validation since we're not using Zod anymore
    if (!args || typeof args !== 'object') {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: args must be an object' }] 
      };
    }
    
    const { userId } = args;
    
    // Validate required field
    if (typeof userId !== 'number' || !Number.isInteger(userId)) {
      return { 
        isError: true, 
        content: [{ type: 'text', text: 'Invalid input: userId must be an integer' }] 
      };
    }
    console.error(`[MCP Tool: listUserHourlyRates] Received validated request with args: ${JSON.stringify(args)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }

    const commandName = "user-rate list";
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" user-rate list --userId ${userId}`;

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 60000, cwd: cdcAppDir, env: { ...process.env } }; // 1 minute timeout

    console.error(`[MCP Tool: listUserHourlyRates] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (stdout && stdout.trim().length > 0) console.error(`[CDC Output - user-rate list - STDOUT for user ${userId}]:\n${stdout.trim()}`);
        if (stderr && stderr.trim().length > 0) console.error(`[CDC Output - user-rate list - STDERR for user ${userId}]:\n${stderr.trim()}`);

        if (error) {
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: listUserHourlyRates] CDC command "user-rate list" for user ${userId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "user-rate list" for user ${userId}: ${errorMessage}` }],
          });
          return;
        }
        
        console.error(`[MCP Tool: listUserHourlyRates] CDC command "user-rate list" for user ${userId} executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "user-rate list" for user ${userId} completed successfully. Output:\n${stdout}` }],
        });
      });
    });
  },
};
