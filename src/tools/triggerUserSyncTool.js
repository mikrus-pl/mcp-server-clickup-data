require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: triggerUserSync] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'triggerUserSync',
  description: 'Triggers the "sync-users" command in the ClickUp Data Collector application.',
  inputSchema: { // Nie przyjmuje specyficznych argumentów
    type: 'object',
    properties: {},
  },
  handler: async (args) => {
    console.error(`[MCP Tool: triggerUserSync] Received request.`);
    if (!CDC_APP_SCRIPT_PATH) { /* ... obsługa błędu braku ścieżki ... */ }

    const commandName = "sync-users";
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName}`;
    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 300000, cwd: cdcAppDir, env: { ...process.env } };

    console.error(`[MCP Tool: triggerUserSync] Executing: ${cliCommand} in ${cdcAppDir}`);
    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        // ... (logika obsługi error, stdout, stderr i resolve - taka sama jak w Twoim kodzie) ...
        if (error) {
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: triggerUserSync] Error: code ${error.code}, signal ${error.signal}, msg: ${errorMessage.trim()}`);
          resolve({ isError: true, content: [{ type: 'text', text: `Error executing ${commandName}: ${errorMessage.trim()}` }] });
          return;
        }
        console.log(`[MCP Tool: triggerUserSync] Stdout:\n${stdout}`);
        if (stderr) console.warn(`[MCP Tool: triggerUserSync] Stderr:\n${stderr}`);
        resolve({ content: [{ type: 'text', text: `Command "${commandName}" executed.\nStdout:\n${stdout}${stderr ? '\nStderr:\n' + stderr : ''}` }] });
      });
    });
  },
};