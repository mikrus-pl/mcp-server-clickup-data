require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: setUserHourlyRate] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'setUserHourlyRate',
  description: 'Sets a new hourly rate for a user in the ClickUp Data Collector application. Requires userId, rate, and fromDate (YYYY-MM-DD).',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { 
        type: 'integer',
        description: 'The ClickUp User ID (numeric) for whom to set the rate.' 
      },
      rate: { 
        type: 'number', 
        description: 'The new hourly rate as a number (e.g., 30 or 30.50).' 
      },
      fromDate: { 
        type: 'string', 
        pattern: '^\\d{4}-\\d{2}-\\d{2}$', 
        description: 'Date from which the rate is effective, in YYYY-MM-DD format.' 
      },
    },
    required: ['userId', 'rate', 'fromDate'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { userId, rate, fromDate } = safeArgs;
    console.error(`[MCP Tool: setUserHourlyRate] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    if (userId === undefined || rate === undefined || fromDate === undefined) {
        return { isError: true, content: [{ type: 'text', text: 'Error: userId, rate, and fromDate arguments are all required.'}] };
    }
    if (typeof userId !== 'number' || typeof rate !== 'number' || !String(fromDate).match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Dodatkowa walidacja typów i formatu daty
        let validationError = "Invalid argument types or format. Ensure: ";
        if (typeof userId !== 'number') validationError += "userId is an integer; ";
        if (typeof rate !== 'number') validationError += "rate is a number; ";
        if (!String(fromDate).match(/^\d{4}-\d{2}-\d{2}$/)) validationError += "fromDate is YYYY-MM-DD format.";
        return { isError: true, content: [{ type: 'text', text: validationError }] };
    }

    const commandName = "user-rate set";
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" user-rate set --userId ${userId} --rate ${rate} --fromDate "${fromDate}"`;

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 60000, cwd: cdcAppDir, env: { ...process.env } }; // 1 minuta timeout

    console.error(`[MCP Tool: setUserHourlyRate] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (stdout && stdout.trim().length > 0) console.error(`[CDC Output - user-rate set - STDOUT for user ${userId}]:\n${stdout.trim()}`);
        if (stderr && stderr.trim().length > 0) console.error(`[CDC Output - user-rate set - STDERR for user ${userId}]:\n${stderr.trim()}`);

        if (error) {
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: setUserHourlyRate] CDC command "user-rate set" for user ${userId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "user-rate set" for user ${userId}: ${errorMessage}` }],
          });
          return;
        }
        
        console.error(`[MCP Tool: setUserHourlyRate] CDC command "user-rate set" for user ${userId} executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "user-rate set" for user ${userId} completed successfully. New rate ${rate} from ${fromDate}. Check server logs for details.` }],
        });
      });
    });
  },
};