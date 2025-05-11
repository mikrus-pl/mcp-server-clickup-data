require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerTaskSync] ERROR: CDC_APP_SCRIPT_PATH is not set in .env for the MCP Server.');
}

module.exports = {
  name: 'triggerTaskSync',
  description: 'Triggers the "sync-tasks" command in CDC for a specific list ID. Allows for full sync and including archived tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      listId: { 
        type: 'string', 
        description: 'ClickUp List ID to synchronize tasks from.' 
      },
      fullSync: { 
        type: 'boolean', 
        description: 'Perform a full synchronization, ignoring the last sync timestamp. Defaults to false.', 
        default: false 
      },
      archived: { 
        type: 'boolean', 
        description: 'Include archived tasks in the synchronization. Defaults to false.', 
        default: false 
      },
    },
    required: ['listId'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { listId, fullSync = false, archived = false } = safeArgs; // Użyj wartości domyślnych ze schematu
    console.error(`[MCP Tool: triggerTaskSync] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    if (!listId) {
      return { isError: true, content: [{ type: 'text', text: 'Error: listId argument is required for triggerTaskSync.' }] };
    }

    const commandName = "sync-tasks";
    let cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName} --listId "${listId}"`;

    if (fullSync) {
      cliCommand += ` --full-sync`;
    }
    if (archived) {
      cliCommand += ` --archived`;
    }

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 600000, cwd: cdcAppDir, env: { ...process.env } }; // 10 minut timeout

    console.error(`[MCP Tool: triggerTaskSync] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (stdout && stdout.trim().length > 0) console.error(`[CDC Output - ${commandName} - STDOUT for list ${listId}]:\n${stdout.trim()}`);
        if (stderr && stderr.trim().length > 0) console.error(`[CDC Output - ${commandName} - STDERR for list ${listId}]:\n${stderr.trim()}`);

        if (error) {
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: triggerTaskSync] CDC command "${commandName}" for list ${listId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandName}" for list ${listId}: ${errorMessage}` }],
          });
          return;
        }
        
        console.error(`[MCP Tool: triggerTaskSync] CDC command "${commandName}" for list ${listId} executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "${commandName}" for list ${listId} completed successfully. Check server logs for details.` }],
        });
      });
    });
  },
};