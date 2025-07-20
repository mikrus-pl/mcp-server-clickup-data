// src/tools/triggerDataCollectorSyncTool.js
require('dotenv').config(); // Tylko do wczytania CDC_APP_SCRIPT_PATH dla tego pliku
const { exec } = require('child_process');
const path = require('path'); // Będziemy potrzebować modułu path

const CDC_APP_SCRIPT_PATH = process.env.CDC_APP_SCRIPT_PATH;

if (!CDC_APP_SCRIPT_PATH) {
  console.error('[MCP Tool: triggerDataCollectorSync] ERROR: CDC_APP_SCRIPT_PATH is not set in .env file for the MCP Server.');
}

module.exports = {
  name: 'triggerDataCollectorSync',
  description: 'Triggers a synchronization command in the ClickUp Data Collector application. Available commands: "sync-users", "sync-tasks", "generate-aggregates", "full-sync".',
  inputSchema: {
    type: 'object',
    properties: {
      commandName: {
        type: 'string',
        description: 'The CDC command to execute.',
        enum: ["sync-users", "sync-tasks", "generate-aggregates", "full-sync", "setup-db", "purge-data"], // Dodajmy więcej, jeśli trzeba
      },
      listId: {
        type: 'string',
        description: 'ClickUp List ID (required for "sync-tasks", "generate-aggregates", "full-sync"). Optional otherwise.'
      },
      fullSyncFlag: {
          type: 'boolean',
          description: 'Set to true to force full sync for "sync-tasks". Defaults to false.',
          default: false
      },
      confirmFlag: { // Dla purge-data
          type: 'boolean',
          description: 'Set to true to confirm destructive operations like "purge-data". Defaults to false.',
          default: false
      }
    },
    required: ['commandName'],
  },
  handler: async (args) => {
    const safeArgs = args || {};
    const { commandName, listId, fullSyncFlag, confirmFlag } = safeArgs; // Dodajemy confirmFlag
    console.error(`[MCP Tool: triggerDataCollectorSync] Received request with args:`, JSON.stringify(safeArgs));

    if (!commandName) {
        console.error('[MCP Tool: triggerDataCollectorSync] Error: commandName is undefined or missing.');
        return {
            isError: true,
            content: [{ type: 'text', text: 'Error: commandName argument is required and was not provided.' }],
        };
    }

    if (!CDC_APP_SCRIPT_PATH) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Server configuration error: CDC_APP_SCRIPT_PATH is not set.' }],
      };
    }

    let cliCommand = `node "${path.basename(CDC_APP_SCRIPT_PATH)}" ${commandName}`; // Użyj tylko nazwy pliku, cwd załatwi resztę

    if (listId && (commandName === 'sync-tasks' || commandName === 'generate-aggregates' || commandName === 'full-sync')) {
      cliCommand += ` --listId ${listId}`;
    } else if (!listId && (commandName === 'sync-tasks' || commandName === 'generate-aggregates' || commandName === 'full-sync')) {
        return {
            isError: true,
            content: [{ type: 'text', text: `Error: listId is required for command "${commandName}".` }],
        };
    }

    if (commandName === 'sync-tasks' && fullSyncFlag) {
        cliCommand += ` --full-sync`;
    }

    if (commandName === 'purge-data' && confirmFlag) {
        cliCommand += ` --confirm`;
    } else if (commandName === 'purge-data' && !confirmFlag) {
        return { // Zwracamy informację, że potrzebne jest potwierdzenie, tak jak robi to samo CLI CDC
            isError: false, // To nie jest błąd wykonania, tylko informacja
            content: [{ type: 'text', text: `Data purge operation for CDC was not confirmed. To purge CDC data, set confirmFlag to true.` }],
        };
    }

    console.error(`[MCP Tool: triggerDataCollectorSync] Preparing to execute CDC command: ${cliCommand}`);

    return new Promise((resolve) => {
      const cdcAppDir = path.dirname(CDC_APP_SCRIPT_PATH); // Pobierz katalog główny aplikacji CDC
      console.error(`[MCP Tool: triggerDataCollectorSync] Setting CWD for CDC to: ${cdcAppDir}`);

      const executionOptions = {
        timeout: 300000, // 5 minut
        cwd: cdcAppDir,  // Ustaw bieżący katalog roboczy na katalog aplikacji CDC
        env: {
            ...process.env // Przekaż środowisko serwera MCP, CDC i tak załaduje swoje .env i może nadpisać/dodać
        }
      };

      exec(cliCommand, executionOptions, (error, stdout, stderr) => {
        if (error) {
          // Logi błędów z stderr CDC są często bardziej informacyjne
          const errorMessage = stderr || error.message;
          console.error(`[MCP Tool: triggerDataCollectorSync] CDC command execution error for "${commandName}": code ${error.code}, signal ${error.signal}`);
          console.error(`[MCP Tool: triggerDataCollectorSync] CDC stderr: ${stderr}`);
          console.error(`[MCP Tool: triggerDataCollectorSync] CDC stdout (if any on error): ${stdout}`);
          resolve({
            isError: true,
            content: [{ type: 'text', text: `Error executing CDC command "${commandName}": ${errorMessage.trim()}` }],
          });
          return;
        }
        console.log(`[MCP Tool: triggerDataCollectorSync] CDC command "${commandName}" stdout:\n${stdout}`);
        if (stderr) { // stderr może zawierać warningi, nawet przy sukcesie
          console.warn(`[MCP Tool: triggerDataCollectorSync] CDC command "${commandName}" stderr (may contain warnings):\n${stderr}`);
        }
        resolve({
          content: [{ type: 'text', text: `CDC command "${commandName}" executed.\nStdout:\n${stdout}\n${stderr ? 'Stderr:\n' + stderr : ''}` }],
        });
      });
    });
  },
};