require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
const { z } = require('zod');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: setUserHourlyRate] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'setUserHourlyRate',
  description: 'Sets a new hourly rate for a user in the ClickUp Data Collector application. Requires userId, rate, and fromDate (YYYY-MM-DD).',
  inputSchema: z.object({
    userId: z.number().int()
      .describe('The ClickUp User ID (numeric) for whom to set the rate.'),
    rate: z.number()
      .describe('The new hourly rate as a number (e.g., 30 or 30.50).'),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe('Date from which the rate is effective, in YYYY-MM-DD format.'),
  }),
  handler: async (args) => {
    const { userId, rate, fromDate } = args;
    console.error(`[MCP Tool: setUserHourlyRate] Received validated request with args: ${JSON.stringify(args)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
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