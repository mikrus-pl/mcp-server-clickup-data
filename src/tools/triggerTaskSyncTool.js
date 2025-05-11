require('dotenv').config(); // Dla CDC_APP_SCRIPT_PATH
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerTaskSync] ERROR: CDC_APP_SCRIPT_PATH is not set in .env for the MCP Server.');
  // Można by rzucić błąd tutaj, aby serwer się nie uruchomił, jeśli ta ścieżka jest krytyczna od startu
}

module.exports = {
  name: 'triggerTaskSync',
  description: 'Triggers the "sync-tasks" command in the ClickUp Data Collector application for a specific list ID. Allows for full sync and including archived tasks.',
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
    const { listId, fullSync = false, archived = false } = safeArgs;
    console.error(`[MCP Tool: triggerTaskSync] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }],
      };
    }

    if (!listId) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Error: listId argument is required for triggerTaskSync.' }],
      };
    }

    const commandName = "sync-tasks";
    let cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName} --listId "${listId}"`; // Dodaj cudzysłowy wokół listId

    if (fullSync) {
      cliCommand += ` --full-sync`;
    }
    if (archived) {
      cliCommand += ` --archived`;
    }

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 600000, cwd: cdcAppDir, env: { ...process.env } }; // Timeout 10 minut dla task sync

    console.error(`[MCP Tool: triggerTaskSync] Preparing to execute CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (error) {
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: triggerTaskSync] CDC command execution error: code ${error.code}, signal ${error.signal}`);
          console.error(`[MCP Tool: triggerTaskSync] CDC stderr: ${stderr}`);
          console.error(`[MCP Tool: triggerTaskSync] CDC stdout (if any on error): ${stdout}`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandName}": ${errorMessage.trim()}` }],
          });
          return;
        }
        console.log(`[MCP Tool: triggerTaskSync] CDC command "${commandName}" stdout:\n${stdout}`);
        if (stderr) {
          console.warn(`[MCP Tool: triggerTaskSync] CDC command "${commandName}" stderr (may contain warnings):\n${stderr}`);
        }
        resolve({
          content: [{ type: 'text', text: `CDC command "${commandName}" executed for list ${listId}.\nStdout:\n${stdout}${stderr ? '\nStderr:\n' + stderr : ''}` }],
        });
      });
    });
  },
};