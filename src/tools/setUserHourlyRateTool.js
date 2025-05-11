require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: setUserHourlyRate] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'setUserHourlyRate',
  description: 'Sets a new hourly rate for a user in the ClickUp Data Collector application.',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { 
        type: 'integer', // ClickUp User ID (liczba)
        description: 'The ClickUp User ID for whom to set the rate.' 
      },
      rate: { 
        type: 'number', 
        description: 'The new hourly rate (e.g., 30.50).' 
      },
      fromDate: { 
        type: 'string', 
        pattern: '^\\d{4}-\\d{2}-\\d{2}$', 
        description: 'Date from which the rate is effective (YYYY-MM-DD).' 
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
        return { isError: true, content: [{ type: 'text', text: 'Error: userId, rate, and fromDate arguments are required.'}] };
    }
    if (typeof userId !== 'number' || typeof rate !== 'number' || !fromDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return { isError: true, content: [{ type: 'text', text: 'Error: Invalid argument types for setUserHourlyRate.'}] };
    }


    const commandName = "user-rate set"; // Komenda w CDC to "user-rate set"
    // `node app.js user-rate set --userId X --rate Y --fromDate ZZZZ-ZZ-ZZ`
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" user-rate set --userId ${userId} --rate ${rate} --fromDate "${fromDate}"`;

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 60000, cwd: cdcAppDir, env: { ...process.env } }; // 1 minuta timeout

    console.error(`[MCP Tool: setUserHourlyRate] Preparing to execute CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (error) {
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: setUserHourlyRate] CDC command execution error: code ${error.code}, signal ${error.signal}`);
          console.error(`[MCP Tool: setUserHourlyRate] CDC stderr: ${stderr}`);
          console.error(`[MCP Tool: setUserHourlyRate] CDC stdout (if any on error): ${stdout}`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "user-rate set": ${errorMessage.trim()}` }],
          });
          return;
        }
        console.log(`[MCP Tool: setUserHourlyRate] CDC command "user-rate set" stdout:\n${stdout}`);
        if (stderr) {
          console.warn(`[MCP Tool: setUserHourlyRate] CDC command "user-rate set" stderr (may contain warnings):\n${stderr}`);
        }
        resolve({
          content: [{ type: 'text', text: `CDC command "user-rate set" executed for user ${userId}.\nStdout:\n${stdout}${stderr ? '\nStderr:\n' + stderr : ''}` }],
        });
      });
    });
  },
};