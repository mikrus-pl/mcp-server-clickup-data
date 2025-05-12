// Importuj dotenv, aby załadować zmienne środowiskowe (np. CDC_APP_SCRIPT_PATH)
require('dotenv').config(); 
// Importuj moduł 'exec' z 'child_process' do wykonywania komend systemowych
const { exec } = require('child_process');
// Importuj moduł 'path' do manipulacji ścieżkami plików
const path = require('path');
// Importuj naszą funkcję do parsowania outputu komendy sync-users z CDC
const { parseSyncUsersOutput } = require('../utils/cdcOutputParser'); 

// Wczytaj ścieżkę do głównego skryptu aplikacji ClickUp Data Collector (CDC)
const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

// Sprawdzenie przy starcie modułu, czy ścieżka do CDC jest ustawiona
if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerUserSync] CRITICAL ERROR: CDC_APP_SCRIPT_PATH is not set in the .env file for the MCP Server. This tool will not function correctly.');
}

module.exports = {
  // Nazwa narzędzia, unikalna w obrębie serwera MCP
  name: 'triggerUserSync',
  // Opis narzędzia, który będzie widoczny dla LLM i klienta MCP
  description: 'Triggers the "sync-users" command in the ClickUp Data Collector application. This synchronizes user data from ClickUp with the local database.',
  // Schemat JSON definiujący oczekiwane argumenty wejściowe dla tego narzędzia
  inputSchema: { 
    type: 'object',
    properties: {}, // Pusty obiekt, ponieważ to narzędzie nie przyjmuje żadnych argumentów od klienta MCP
  },
  // outputSchema: { ... } // Można zdefiniować, jeśli chcemy zwracać structuredContent (opcjonalne dla MVP)

  // Asynchroniczna funkcja (handler), która zostanie wykonana, gdy LLM wywoła to narzędzie
  handler: async (args) => { // `args` będzie pustym obiektem lub zdefiniowanym przez inputSchema
    // Logowanie na stderr serwera MCP informacji o otrzymanym żądaniu
    console.error(`[MCP Tool: triggerUserSync] Received request. Args: ${JSON.stringify(args || {})}`);

    // Sprawdzenie, czy ścieżka do CDC jest dostępna (powtórne sprawdzenie na wypadek problemów)
    if (!CDC_APP_SCRIPT_PATH) {
      return { // Zwróć błąd, jeśli konfiguracja serwera jest niepoprawna
        isError: true,
        content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set. Cannot execute CDC command.' }],
      };
    }

    const commandNameInCDC = "sync-users"; // Nazwa komendy w aplikacji CDC
    // Budowanie pełnej komendy do wykonania w terminalu
    // Używamy path.basename, aby uniknąć problemów ze spacjami w ścieżce do katalogu CDC,
    // a `cwd` w `executionOptions` ustawi poprawny katalog roboczy.
    const cliCommandToExecute = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandNameInCDC}`;
    // Określenie katalogu, w którym znajduje się aplikacja CDC
    const cdcApplicationDirectory = path.dirname(CDC_APP_SCRIPT_PATH); 
    
    // Opcje dla `child_process.exec`
    const executionOptions = { 
      timeout: 300000, // Timeout ustawiony na 5 minut (w milisekundach)
      cwd: cdcApplicationDirectory,  // Ustawia bieżący katalog roboczy dla wykonywanej komendy na katalog aplikacji CDC
      env: { ...process.env } // Przekazuje obecne zmienne środowiskowe do procesu potomnego
    };

    console.error(`[MCP Tool: triggerUserSync] Executing CDC command: ${cliCommandToExecute} in CWD: ${cdcApplicationDirectory}`);

    // Zwracamy Promise, ponieważ `exec` jest operacją asynchroniczną
    return new Promise((resolve) => {
      exec(cliCommandToExecute, executionOptions, (error, stdout, stderr) => {
        // Przetwarzanie outputu z CDC za pomocą dedykowanego parsera
        const parsedOutput = parseSyncUsersOutput(stdout, stderr);

        // Logowanie pełnego stdout i stderr z procesu CDC na stderr serwera MCP (dla celów debugowania)
        if (parsedOutput.rawStdout && parsedOutput.rawStdout.trim().length > 0) {
          console.error(`[CDC Output - ${commandNameInCDC} - STDOUT]:\n${parsedOutput.rawStdout.trim()}`);
        }
        // Surowy stderr z CDC, może zawierać warningi lub błędy
        if (stderr && stderr.trim().length > 0) { 
          console.error(`[CDC Output - ${commandNameInCDC} - STDERR (raw)]:\n${stderr.trim()}`);
        }

        // Sprawdzenie, czy wykonanie komendy CDC zakończyło się błędem
        if (error) {
          // Jeśli tak, przygotuj komunikat błędu dla LLM
          // Preferuj stderr jako źródło komunikatu błędu, jeśli jest dostępne
          const briefErrorMessage = (stderr && stderr.trim().length > 0) ? stderr.trim().split('\n')[0] : error.message;
          console.error(`[MCP Tool: triggerUserSync] CDC command "${commandNameInCDC}" execution FAILED: Exit code ${error.code}, Signal ${error.signal}.`);
          resolve({ // Zwróć odpowiedź narzędzia MCP wskazującą na błąd
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandNameInCDC}": ${briefErrorMessage.substring(0, 250)}` }],
            // structuredContent: { status: 'failure', message: `CDC command "${commandNameInCDC}" failed.`, errorDetails: briefErrorMessage.substring(0,500) }
          });
          return; // Zakończ callback
        }
        
        // Jeśli nie ma błędu (`error` jest null), komenda CDC zakończyła się sukcesem
        let successMessage = `CDC command "${commandNameInCDC}" completed.`;
        // Dodaj sparsowane informacje do komunikatu sukcesu
        if (parsedOutput.newInDb !== null || parsedOutput.updatedInDb !== null) {
            successMessage += ` Results: ${parsedOutput.newInDb || 0} new users, ${parsedOutput.updatedInDb || 0} updated users.`;
        } else {
            successMessage += ` Check server logs for detailed output.`; // Fallback, jeśli parsowanie się nie udało
        }
        
        console.error(`[MCP Tool: triggerUserSync] CDC command "${commandNameInCDC}" executed successfully.`);
        resolve({ // Zwróć odpowiedź narzędzia MCP wskazującą na sukces
          content: [{ type: 'text', text: successMessage }],
          // structuredContent: { 
          //   status: 'success', 
          //   message: successMessage,
          //   details: {
          //       fetchedFromClickUp: parsedOutput.fetchedFromClickUp,
          //       newInDb: parsedOutput.newInDb,
          //       updatedInDb: parsedOutput.updatedInDb
          //   }
          // }
        });
      });
    });
  },
};