require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: deactivateUserHourlyRate] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'deactivateUserHourlyRate',
  description: 'Deactivates a specific hourly rate by setting its end date to yesterday in the ClickUp Data Collector application. Requires rateId.',
  inputSchema: {
    type: 'object',
    properties: {
      rateId: { 
        type: 'integer',
        description: 'The Rate ID (numeric) to deactivate.' 
      }
    },
    required: ['rateId'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { rateId } = safeArgs;
    console.error(`[MCP Tool: deactivateUserHourlyRate] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    if (rateId === undefined) {
        return { isError: true, content: [{ type: 'text', text: 'Error: rateId argument is required.'}] };
    }
    if (typeof rateId !== 'number') {
        return { isError: true, content: [{ type: 'text', text: 'Invalid argument type. Ensure rateId is an integer.' }] };
    }

    const commandName = "user-rate deactivate";
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" user-rate deactivate --rateId ${rateId}`;

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 60000, cwd: cdcAppDir, env: { ...process.env } }; // 1 minute timeout

    console.error(`[MCP Tool: deactivateUserHourlyRate] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (stdout && stdout.trim().length > 0) console.error(`[CDC Output - user-rate deactivate - STDOUT for rate ${rateId}]:\n${stdout.trim()}`);
        if (stderr && stderr.trim().length > 0) console.error(`[CDC Output - user-rate deactivate - STDERR for rate ${rateId}]:\n${stderr.trim()}`);

        if (error) {
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: deactivateUserHourlyRate] CDC command "user-rate deactivate" for rate ${rateId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "user-rate deactivate" for rate ${rateId}: ${errorMessage}` }],
          });
          return;
        }
        
        console.error(`[MCP Tool: deactivateUserHourlyRate] CDC command "user-rate deactivate" for rate ${rateId} executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "user-rate deactivate" for rate ${rateId} completed successfully. Rate should be deactivated. Output:\n${stdout}` }],
        });
      });
    });
  },
};
