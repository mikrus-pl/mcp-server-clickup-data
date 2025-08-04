require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const { z } = require('zod');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: purgeDatabase] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'purgeDatabase',
  description: 'Triggers the "purge-data --confirm" command in the ClickUp Data Collector application. This will delete all data from the CDC database!',
  inputSchema: z.object({
    confirm: z.literal(true)
      .describe('Must be set to true to confirm data purge. This is a destructive operation.'),
  }),
  handler: async (args) => {
    const { confirm } = args;
    console.error(`[MCP Tool: purgeDatabase] Received validated request with args: ${JSON.stringify(args)}`);

    if (!CDC_APP_SCRIPT_PATH) { /* ... obsługa błędu braku ścieżki ... */ }
    
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