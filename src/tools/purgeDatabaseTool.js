require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: purgeDatabase] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'purgeDatabase',
  description: 'Triggers the "purge-data --confirm" command in the ClickUp Data Collector application. This will delete all data!',
  inputSchema: {
    type: 'object',
    properties: {
        confirm: { // Dodajemy argument, aby LLM musiał jawnie potwierdzić
            type: 'boolean',
            description: 'Must be set to true to confirm data purge.',
            enum: [true] // Wymuszamy, aby było true
        }
    },
    required: ['confirm']
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { confirm } = safeArgs;
    console.error(`[MCP Tool: purgeDatabase] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) { /* ... obsługa błędu ... */ }
    
    if (confirm !== true) {
        return {
            isError: false, // To nie błąd wykonania, tylko brak potwierdzenia
            content: [{ type: 'text', text: 'Data purge operation for CDC requires explicit confirmation by setting "confirm" argument to true.' }],
        };
    }

    const commandName = "purge-data";
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName} --confirm`; // --confirm jest dodawane na stałe

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 120000, cwd: cdcAppDir, env: { ...process.env } }; // 2 minuty timeout

    console.error(`[MCP Tool: purgeDatabase] Preparing to execute CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        // ... (logika obsługi error, stdout, stderr i resolve - taka sama jak wyżej, dostosowując logi i komunikaty) ...
        if (error) {
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: purgeDatabase] Error: code ${error.code}, signal ${error.signal}, msg: ${errorMessage.trim()}`);
          resolve({ isError: true, content: [{ type: 'text', text: `Error executing ${commandName}: ${errorMessage.trim()}` }] });
          return;
        }
        console.log(`[MCP Tool: purgeDatabase] Stdout:\n${stdout}`);
        if (stderr) console.warn(`[MCP Tool: purgeDatabase] Stderr:\n${stderr}`);
        resolve({ content: [{ type: 'text', text: `Command "${commandName}" executed.\nStdout:\n${stdout}${stderr ? '\nStderr:\n' + stderr : ''}` }] });
      });
    });
  },
};