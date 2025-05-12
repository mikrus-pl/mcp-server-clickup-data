require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');
// Dla full-sync możemy próbować parsować outputy poszczególnych kroków,
// ale stdout może być bardzo długi i złożony. Na razie skupimy się na ogólnym statusie.
// Jeśli chcemy szczegółowe dane, LLM powinien wywoływać poszczególne narzędzia synchronizacji.

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: triggerFullSync] CRITICAL ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'triggerFullSync',
  description: 'Triggers the "full-sync" command in the ClickUp Data Collector for a specific list ID. This performs user sync, full task sync, and aggregate generation.',
  inputSchema: {
    type: 'object',
    properties: {
      listId: { 
        type: 'string', 
        description: 'ClickUp List ID (string) to perform the full synchronization for.' 
      },
      // Można dodać `archived`, jeśli komenda `full-sync` w CDC została dostosowana do przyjmowania tej flagi
      // i przekazywania jej do kroku `sync-tasks`.
      // archived: { 
      //   type: 'boolean', 
      //   description: 'Optional. Include archived tasks. Defaults to false.',
      //   default: false 
      // }
    },
    required: ['listId'],
  },
  // outputSchema: { /* ... */ },
  handler: async (args) => {
    const safeArgs = args || {};
    // const { listId, archived = false } = safeArgs; // Jeśli dodasz `archived` do inputSchema
    const { listId } = safeArgs; 
    console.error(`[MCP Tool: triggerFullSync] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) {
      return { isError: true, content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }] };
    }
    if (!listId) {
      return { isError: true, content: [{ type: 'text', text: 'Error: listId argument is required for triggerFullSync.' }] };
    }

    const commandNameInCDC = "full-sync";
    // Budujemy komendę. Zakładamy, że `full-sync` w CDC przyjmuje --listId.
    let cliCommandToExecute = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandNameInCDC} --listId "${listId}"`;
    // if (archived === true) { // Jeśli `full-sync` w CDC obsługuje `--archived`
    //   cliCommandToExecute += ` --archived`;
    // }

    const cdcApplicationDirectory = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { 
      timeout: 1800000, // 30 minut timeout dla pełnej synchronizacji
      cwd: cdcApplicationDirectory, 
      env: { ...process.env } 
    };

    console.error(`[MCP Tool: triggerFullSync] Executing CDC command: ${cliCommandToExecute} in CWD: ${cdcApplicationDirectory}`);

    return new Promise((resolve) => {
      exec(cliCommandToExecute, executionOptions, (error, stdout, stderr) => {
        // Dla full-sync, stdout może być bardzo długi. Skupimy się na ogólnym statusie.
        // Pełne logi i tak trafią na stderr serwera MCP.
        const stdoutTrimmed = stdout ? stdout.trim() : '';
        const stderrTrimmed = stderr ? stderr.trim() : '';

        if (stdoutTrimmed.length > 0) console.error(`[CDC Output - ${commandNameInCDC} - STDOUT for list ${listId}]:\n${stdoutTrimmed}`);
        if (stderrTrimmed.length > 0) console.error(`[CDC Output - ${commandNameInCDC} - STDERR (raw) for list ${listId}]:\n${stderrTrimmed}`);

        if (error) {
          const briefErrorMessage = (stderrTrimmed.length > 0) ? stderrTrimmed.split('\n')[0] : error.message;
          console.error(`[MCP Tool: triggerFullSync] CDC command "${commandNameInCDC}" for list ${listId} FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandNameInCDC}" for list ${listId}: ${briefErrorMessage.substring(0, 250)}` }],
          });
          return;
        }
        
        // Szukamy kluczowych fraz sukcesu z logu, który wkleiłeś
        let successMessage = `CDC command "${commandNameInCDC}" for list ${listId} appears to have completed.`;
        if (stdoutTrimmed.includes("Full sync finished successfully")) {
            successMessage = `CDC command "${commandNameInCDC}" for list ${listId} completed successfully.`;
        } else if (stdoutTrimmed.includes("Full synchronization process completed successfully!")) {
            successMessage = `CDC command "${commandNameInCDC}" for list ${listId} completed successfully (based on final message).`;
        }
        successMessage += " Check server logs for full details.";

        console.error(`[MCP Tool: triggerFullSync] CDC command "${commandNameInCDC}" for list ${listId} finished processing.`);
        resolve({
          content: [{ type: 'text', text: successMessage }],
        });
      });
    });
  },
};