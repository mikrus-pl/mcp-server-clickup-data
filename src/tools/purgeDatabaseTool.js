require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: purgeDatabase] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'purgeDatabase',
  description: 'Triggers the "purge-data --confirm" command in the ClickUp Data Collector application. This will delete all data from the CDC database!',
  inputSchema: {
    type: 'object',
    properties: {
        confirm: {
            type: 'boolean',
            description: 'Must be set to true to confirm data purge. This is a destructive operation.',
            enum: [true] // Wymusza, aby klient MCP wysłał `true`
        }
    },
    required: ['confirm']
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { confirm } = safeArgs;
    console.error(`[MCP Tool: purgeDatabase] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) { /* ... obsługa błędu braku ścieżki ... */ }
    
    if (confirm !== true) {
        // To narzędzie wymaga jawnego potwierdzenia przez LLM/klienta.
        return {
            isError: false, // Nie jest to błąd wykonania, tylko informacja/wymóg
            content: [{ type: 'text', text: 'Data purge operation for CDC requires explicit confirmation by setting the "confirm" argument to true.' }],
        };
    }

    const commandName = "purge-data";
    // Flaga --confirm jest dodawana na stałe, ponieważ schemat wejściowy narzędzia MCP już ją wymusza
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName} --confirm`; 

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 120000, cwd: cdcAppDir, env: { ...process.env } }; // 2 minuty timeout

    console.error(`[MCP Tool: purgeDatabase] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (stdout && stdout.trim().length > 0) console.error(`[CDC Output - ${commandName} - STDOUT]:\n${stdout.trim()}`);
        if (stderr && stderr.trim().length > 0) console.error(`[CDC Output - ${commandName} - STDERR]:\n${stderr.trim()}`);
        
        if (error) {
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: purgeDatabase] CDC command "${commandName}" FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandName}": ${errorMessage}` }],
          });
          return;
        }
        
        console.error(`[MCP Tool: purgeDatabase] CDC command "${commandName}" executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "${commandName}" completed successfully. All data should be purged. Check server logs for details.` }],
        });
      });
    });
  },
};