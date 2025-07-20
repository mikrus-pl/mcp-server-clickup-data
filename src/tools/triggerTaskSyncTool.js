require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
// Importuj parser specyficzny dla outputu komendy sync-tasks
const { parseSyncTasksOutput } = require('../utils/cdcOutputParser');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerTaskSync] CRITICAL ERROR: CDC_APP_SCRIPT_PATH is not set in .env for the MCP Server.');
}

module.exports = {
  name: 'triggerTaskSync',
  description: 'Triggers the "sync-tasks" command in CDC for a specific list ID. Allows for full sync and including archived tasks.',
  inputSchema: {
    type: 'object',
    properties: {
      listId: { 
        type: 'string', 
        description: 'ClickUp List ID (string) to synchronize tasks from.' 
      },
      fullSync: { 
        type: 'boolean', 
        description: 'Optional. Perform a full synchronization, ignoring the last sync timestamp. Defaults to false.', 
        default: false 
      },
      archived: { 
        type: 'boolean', 
        description: 'Optional. Include archived tasks in the synchronization. Defaults to false.', 
        default: false 
      },
    },
    required: ['listId'], // listId jest wymagany
  },
  // outputSchema: { /* ... można zdefiniować dla structuredContent ... */ },
  handler: async (args) => {
    // Użyj wartości domyślnych ze schematu, jeśli argumenty nie są podane
    const safeArgs = args || {};
    const { listId, fullSync = false, archived = false } = safeArgs; 
    console.error(`[MCP Tool: triggerTaskSync] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    // listId jest wymagany przez inputSchema, Yargs/MCP powinno to walidować, ale dodatkowe sprawdzenie nie zaszkodzi
    if (!listId) { 
      return { isError: true, content: [{ type: 'text', text: 'Error: listId argument is required for triggerTaskSync.' }] };
    }

    const commandNameInCDC = "sync-tasks";
    // Budowanie komendy z argumentami
    let cliCommandToExecute = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandNameInCDC} --listId "${listId}"`;

    if (fullSync === true) { // Jawne sprawdzenie boolean
      cliCommandToExecute += ` --full-sync`;
    }
    if (archived === true) { // Jawne sprawdzenie boolean
      cliCommandToExecute += ` --archived`;
    }

    const cdcApplicationDirectory = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { 
      timeout: 600000, // 10 minut timeout dla synchronizacji zadań, może być długa
      cwd: cdcApplicationDirectory, 
      env: { ...process.env } 
    };

    console.error(`[MCP Tool: triggerTaskSync] Executing CDC command: ${cliCommandToExecute} in CWD: ${cdcApplicationDirectory}`);

    return new Promise((resolve) => {
      exec(cliCommandToExecute, executionOptions, (error, stdout, stderr) => {
        const parsedOutput = parseSyncTasksOutput(stdout, stderr);

        if (parsedOutput.rawStdout && parsedOutput.rawStdout.trim().length > 0) {
          console.error(`[CDC Output - ${commandNameInCDC} - STDOUT for list ${listId}]:\n${parsedOutput.rawStdout.trim()}`);
        }
        if (stderr && stderr.trim().length > 0) {
          console.error(`[CDC Output - ${commandNameInCDC} - STDERR (raw) for list ${listId}]:\n${stderr.trim()}`);
        }

        if (error) {
          const briefErrorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim().split('\n')[0] : error.message;
          console.error(`[MCP Tool: triggerTaskSync] CDC command "${commandNameInCDC}" for list ${listId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandNameInCDC}" for list ${listId}: ${briefErrorMessage.substring(0, 250)}` }],
          });
          return;
        }
        
        let successMessage = `CDC command "${commandNameInCDC}" for list ${listId} completed.`;
        if (parsedOutput.totalFetchedApi !== null) {
            successMessage += ` Fetched approx. ${parsedOutput.totalFetchedApi} tasks/subtasks from API.`;
        }
        if (parsedOutput.processedNew !== null || parsedOutput.processedUpdated !== null) {
            successMessage += ` DB: ${parsedOutput.processedNew || 0} new, ${parsedOutput.processedUpdated || 0} updated.`;
        }
        if (parsedOutput.parentSubtaskWarnings > 0) {
            successMessage += ` Encountered ${parsedOutput.parentSubtaskWarnings} subtasks incorrectly marked as parent.`;
        }
        
        console.error(`[MCP Tool: triggerTaskSync] CDC command "${commandNameInCDC}" for list ${listId} executed successfully.`);
        resolve({
          content: [{ type: 'text', text: successMessage }],
        });
      });
    });
  },
};