require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: triggerGenerateAggregates] CRITICAL ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'triggerGenerateAggregates',
  description: 'Triggers the "generate-aggregates" command in the ClickUp Data Collector. This calculates aggregated time spent on tasks for reporting purposes.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: []
  },
  handler: async (args) => {
    // Manual validation since we're not using Zod anymore
    if (args && typeof args !== 'object') {
      return { 
        isError: true, 
        content: [{ 
          type: 'text', 
          text: 'Invalid input: args must be an object' 
        }] 
      };
    }
    
    // Load listId from environment variable
    const listId = process.env.CLICKUP_LIST_ID;

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    if (!listId) {
      return { isError: true, content: [{ type: 'text', text: 'Error: CLICKUP_LIST_ID is not set in environment variables.' }] };
    }

    const commandNameInCDC = "generate-aggregates";
    // Build command. Always generate all aggregates (no userId filter)
    let cliCommandToExecute = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandNameInCDC} --listId "${listId}"`;

    const cdcApplicationDirectory = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { 
      timeout: 600000, // 10 minutes timeout for aggregate generation
      cwd: cdcApplicationDirectory, 
      env: { ...process.env } 
    };

    console.error(`[MCP Tool: triggerGenerateAggregates] Executing CDC command: ${cliCommandToExecute} in CWD: ${cdcApplicationDirectory}`);

    return new Promise((resolve) => {
      exec(cliCommandToExecute, executionOptions, (error, stdout, stderr) => {
        const stdoutTrimmed = stdout ? stdout.trim() : '';
        const stderrTrimmed = stderr ? stderr.trim() : '';

        if (stdoutTrimmed.length > 0) console.error(`[CDC Output - ${commandNameInCDC} - STDOUT for list ${listId}]:\n${stdoutTrimmed}`);
        if (stderrTrimmed.length > 0) console.error(`[CDC Output - ${commandNameInCDC} - STDERR (raw) for list ${listId}]:\n${stderrTrimmed}`);

        if (error) {
          const briefErrorMessage = (stderrTrimmed.length > 0) ? stderrTrimmed.split('\n')[0] : error.message;
          console.error(`[MCP Tool: triggerGenerateAggregates] CDC command "${commandNameInCDC}" for list ${listId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandNameInCDC}" for list ${listId}: ${briefErrorMessage.substring(0, 250)}` }],
          });
          return;
        }
        
        let successMessage = `CDC command "${commandNameInCDC}" for list ${listId} completed successfully.`;
        
        // Try to extract some statistics from the output if available
        if (stdoutTrimmed.includes("Generated")) {
          const lines = stdoutTrimmed.split('\n');
          const generatedLine = lines.find(line => line.includes("Generated"));
          if (generatedLine) {
            successMessage += ` ${generatedLine.trim()}.`;
          }
        }
        
        console.error(`[MCP Tool: triggerGenerateAggregates] CDC command "${commandNameInCDC}" for list ${listId} finished processing.`);
        resolve({
          content: [{ type: 'text', text: successMessage }],
        });
      });
    });
  },
};
