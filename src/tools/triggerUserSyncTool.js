require('dotenv').config(); // Dla CDC_APP_SCRIPT_PATH
const { exec } = require('child_process');
const path = require('path');

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerUserSync] ERROR: CDC_APP_SCRIPT_PATH is not set in .env for the MCP Server. This tool will not function correctly.');
}

module.exports = {
  name: 'triggerUserSync',
  description: 'Triggers the "sync-users" command in the ClickUp Data Collector application to synchronize user data from ClickUp to the local database.',
  inputSchema: { // To narzędzie nie przyjmuje specyficznych argumentów wejściowych od klienta MCP
    type: 'object',
    properties: {}, // Pusty obiekt oznacza brak parametrów
  },
  handler: async (args) => { // args będzie pustym obiektem lub {}
    console.error(`[MCP Tool: triggerUserSync] Received request. Args: ${JSON.stringify(args || {})}`); // Log serwera MCP na stderr

    if (!CDC_APP_SCRIPT_PATH) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set. Cannot execute CDC command.' }],
      };
    }

    const commandName = "sync-users";
    // Budujemy komendę do wykonania. Używamy basename, a cwd ustawi kontekst wykonania.
    const cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName}`;
    const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH); // Katalog główny aplikacji CDC
    
    // Opcje wykonania dla child_process.exec
    const executionOptions = { 
      timeout: 300000, // 5 minut timeout
      cwd: cdcAppDir,  // Ustaw bieżący katalog roboczy
      env: { ...process.env } // Przekaż bieżące zmienne środowiskowe
    };

    console.error(`[MCP Tool: triggerUserSync] Executing CDC command: ${cliCommand} in CWD: ${cdcAppDir}`); // Log serwera MCP na stderr

    return new Promise((resolve) => {
      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        // Logowanie stdout i stderr z procesu potomnego na stderr procesu serwera MCP
        if (stdout && stdout.trim().length > 0) {
          console.error(`[CDC Output - ${commandName} - STDOUT]:\n${stdout.trim()}`);
        }
        if (stderr && stderr.trim().length > 0) {
          // Stderr może zawierać warningi nawet przy sukcesie, lub błędy krytyczne
          console.error(`[CDC Output - ${commandName} - STDERR]:\n${stderr.trim()}`);
        }

        if (error) {
          // Jeśli `error` istnieje, komenda zakończyła się błędem
          const errorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim() : error.message;
          console.error(`[MCP Tool: triggerUserSync] CDC command "${commandName}" execution FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandName}": ${errorMessage}` }],
          });
          return;
        }
        
        // Jeśli nie ma obiektu `error`, komenda zakończyła się pomyślnie (kod wyjścia 0)
        console.error(`[MCP Tool: triggerUserSync] CDC command "${commandName}" executed successfully.`);
        resolve({
          content: [{ type: 'text', text: `CDC command "${commandName}" completed successfully. Check server logs for details.` }],
        });
      });
    });
  },
};