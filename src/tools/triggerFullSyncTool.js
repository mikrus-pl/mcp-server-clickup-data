require('dotenv').config();
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;
if (!CDC_APP_SCRIPT_PATH) console.error('[MCP Tool: triggerFullSync] ERROR: CDC_APP_SCRIPT_PATH not set.');

module.exports = {
  name: 'triggerFullSync',
  description: 'Triggers the "full-sync" command in the ClickUp Data Collector for a specific list ID. This performs user sync, full task sync, and aggregate generation.',
  inputSchema: {
    type: 'object',
    properties: {
      listId: { 
        type: 'string', 
        description: 'ClickUp List ID to perform the full synchronization for.' 
      },
       archived: { // Dodajemy, bo full-sync może przekazywać do task-sync
        type: 'boolean',
        description: 'Include archived tasks. Defaults to false.',
        default: false
      }
    },
    required: ['listId'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { listId, archived = false } = safeArgs;
    console.error(`[MCP Tool: triggerFullSync] Received request with args: ${JSON.stringify(safeArgs)}`);

    if (!CDC_APP_SCRIPT_PATH) { /* ... obsługa błędu ... */ }
    if (!listId) return { isError: true, content: [{ type: 'text', text: 'Error: listId is required for triggerFullSync.'}] };

    const commandName = "full-sync";
    // Komenda full-sync w CDC przyjmowała listId i przekazywała --archived do sync-tasks
    // Musimy się upewnić, że nasza implementacja full-sync w CDC obsługuje --archived
    // Na razie zakładam, że full-sync w CDC obsługuje --listId. Jeśli obsługuje też --archived, można dodać.
    let cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName} --listId "${listId}"`;
    // Jeśli Twój fullSyncCommand.js w CDC przekazuje `argv.archived` do `sync-tasks`, to to wystarczy.
    // Jeśli nie, a chcesz to kontrolować z MCP, musiałbyś dodać `--archived` do komendy `full-sync` w CDC.
    // Na razie zakładam, że `full-sync` w CDC nie bierze bezpośrednio flagi `--archived`,
    // ale `sync-tasks` wewnątrz niego może ją brać (co nie jest sterowane z tego miejsca).
    // Jeśli chcesz kontrolować `archived` dla `full-sync` z poziomu MCP,
    // `fullSyncCommand.js` w CDC musi być dostosowany, by przyjmować i przekazywać `--archived`.
    // Dla tego przykładu, pomijam przekazywanie `archived` do `full-sync`, chyba że go zmodyfikowałeś.

    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH);
    const executionOptions = { timeout: 1800000, cwd: cdcAppDir, env: { ...process.env } }; // Timeout 30 minut dla pełnej synchronizacji

    console.error(`[MCP Tool: triggerFullSync] Preparing to execute CDC command: ${cliCommand} in CWD: ${cdcAppDir}`);

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        // ... (logika obsługi error, stdout, stderr i resolve - taka sama jak wyżej, dostosowując logi i komunikaty) ...
        if (error) {
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: triggerFullSync] Error: code ${error.code}, signal ${error.signal}, msg: ${errorMessage.trim()}`);
          resolve({ isError: true, content: [{ type: 'text', text: `Error executing ${commandName}: ${errorMessage.trim()}` }] });
          return;
        }
        console.log(`[MCP Tool: triggerFullSync] Stdout:\n${stdout}`);
        if (stderr) console.warn(`[MCP Tool: triggerFullSync] Stderr:\n${stderr}`);
        resolve({ content: [{ type: 'text', text: `Command "${commandName}" executed for list ${listId}.\nStdout:\n${stdout}${stderr ? '\nStderr:\n' + stderr : ''}` }] });
      });
    });
  },
};