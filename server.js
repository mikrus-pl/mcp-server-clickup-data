require('dotenv').config();
// Poprawione importy zgodnie z Twoją wcześniejszą udaną konfiguracją i analizą agenta
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js'); 
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js'); 

// Import definicji narzędzi do odczytu danych
const listUsersTool = require('./src/tools/listUsersTool');
const getReportedTaskAggregatesTool = require('./src/tools/getReportedTaskAggregatesTool');

// Usuwamy stary, generyczny trigger i testowy
// const triggerDataCollectorSyncTool = require('./src/tools/triggerDataCollectorSyncTool');
// const testArgumentsTool = require('./src/tools/testArgumentsTool'); // Zakładam, że ten był do testów i nie jest już potrzebny

// Import nowych, specyficznych narzędzi do wywoływania komend CDC
const triggerUserSyncTool = require('./src/tools/triggerUserSyncTool');
const triggerTaskSyncTool = require('./src/tools/triggerTaskSyncTool');
//const triggerAggregateGenerationTool = require('./src/tools/triggerAggregateGenerationTool'); // Pamiętaj o stworzeniu tego pliku
const triggerFullSyncTool = require('./src/tools/triggerFullSyncTool');
const purgeDatabaseTool = require('./src/tools/purgeDatabaseTool');
const setUserHourlyRateTool = require('./src/tools/setUserHourlyRateTool');
const listUserHourlyRatesTool = require('./src/tools/listUserHourlyRatesTool');
const deactivateUserHourlyRateTool = require('./src/tools/deactivateUserHourlyRateTool');

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'ClickUpDataServer';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

async function main() {
  console.error(`[MCP Server] Initializing server: ${SERVER_NAME} v${SERVER_VERSION}`);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
    capabilities: {
      tools: {
        listChanged: false, // Na razie nie wysyłamy notyfikacji o zmianie listy narzędzi
      },
      // Można by tu dodać 'logging: {}' jeśli chcemy, aby serwer mógł wysyłać logi przez MCP
    },
  });

  // Rejestracja narzędzi bezpośrednio na serwerze
  // server.tool(name, inputSchema, handler) - zgodnie z przykładem z README
  // Nasze moduły narzędzi eksportują obiekt { name, description, inputSchema, handler }
  // Musimy dostosować to do API `server.tool`
  // Metoda .tool z SDK zdaje się nie przyjmować `description` jako osobnego argumentu.
  // Opis jest częścią definicji narzędzia, którą klient pobiera przez tools/list.
  // SDK prawdopodobnie buduje odpowiedź dla tools/list na podstawie zarejestrowanych narzędzi.

  // Przykład z README:
  // server.tool("add", { SCHEMA }, async handler);
  // Nasze narzędzia mają opis. Specyfikacja MCP Tool Definition zawiera 'description'.
  // Możliwe, że SDK `McpServer` robi to inaczej niż `FastMCP` z przykładu Pythona.
  // Sprawdźmy, czy obiekt `server` ma metodę `addTool` lub jak dokładnie działa `tool`.

  // Zgodnie z przykładem `Echo Server` z dokumentacji SDK, który również używa McpServer:
  // server.tool( name, inputSchemaAsZodObject, handlerFunction );
  // Wygląda na to, że opis jest brany z inputSchema (jeśli Zod go wspiera) lub jest częścią
  // odpowiedzi na `tools/list` budowanej przez SDK.

  // Najpierw zarejestrujmy narzędzia. Handler tools/list i tools/call powinien być obsłużony przez SDK.
  try {
    // Narzędzia do odczytu danych
    console.error('[MCP Server] Registering tool: listUsers');
    server.tool(
      listUsersTool.name,
      listUsersTool.inputSchema, // Przekazujemy JSON Schema
      listUsersTool.handler
    );
    console.error(`  - Description for listUsers: ${listUsersTool.description}`); // Logujemy opis dla naszej wiedzy

    console.error('[MCP Server] Registering tool: getReportedTaskAggregates');
    server.tool(
      getReportedTaskAggregatesTool.name,
      getReportedTaskAggregatesTool.inputSchema,
      getReportedTaskAggregatesTool.handler
    );
    console.error(`  - Description for getReportedTaskAggregates: ${getReportedTaskAggregatesTool.description}`);

    // Narzędzia do wywoływania komend CDC
    console.error('[MCP Server] Registering tool: triggerUserSync');
    server.tool(
      triggerUserSyncTool.name,
      triggerUserSyncTool.inputSchema,
      triggerUserSyncTool.handler
    );
    console.error(`  - Description for triggerUserSync: ${triggerUserSyncTool.description}`);

    console.error('[MCP Server] Registering tool: triggerTaskSync');
    server.tool(
      triggerTaskSyncTool.name,
      triggerTaskSyncTool.inputSchema,
      triggerTaskSyncTool.handler
    );
    console.error(`  - Description for triggerTaskSync: ${triggerTaskSyncTool.description}`);
    
    // if (triggerAggregateGenerationTool) { // Upewnij się, że plik istnieje i jest poprawnie zaimportowany
    //     console.error('[MCP Server] Registering tool: triggerAggregateGeneration');
    //     server.tool(
    //         triggerAggregateGenerationTool.name,
    //         triggerAggregateGenerationTool.inputSchema,
    //         triggerAggregateGenerationTool.handler
    //     );
    //     console.error(`  - Description for triggerAggregateGeneration: ${triggerAggregateGenerationTool.description}`);
    // } else {
    //     console.warn('[MCP Server] Warning: triggerAggregateGenerationTool.js not found or not imported. Skipping registration.');
    // }

    console.error('[MCP Server] Registering tool: triggerFullSync');
    server.tool(
      triggerFullSyncTool.name,
      triggerFullSyncTool.inputSchema,
      triggerFullSyncTool.handler
    );
    console.error(`  - Description for triggerFullSync: ${triggerFullSyncTool.description}`);
    
    console.error('[MCP Server] Registering tool: purgeDatabase');
    server.tool(
      purgeDatabaseTool.name,
      purgeDatabaseTool.inputSchema,
      purgeDatabaseTool.handler
    );
    console.error(`  - Description for purgeDatabase: ${purgeDatabaseTool.description}`);

    console.error('[MCP Server] Registering tool: setUserHourlyRate');
    server.tool(
      setUserHourlyRateTool.name,
      setUserHourlyRateTool.inputSchema,
      setUserHourlyRateTool.handler
    );
    console.error(`  - Description for setUserHourlyRate: ${setUserHourlyRateTool.description}`);

    console.error('[MCP Server] Registering tool: listUserHourlyRates');
    server.tool(
      listUserHourlyRatesTool.name,
      listUserHourlyRatesTool.inputSchema,
      listUserHourlyRatesTool.handler
    );
    console.error(`  - Description for listUserHourlyRates: ${listUserHourlyRatesTool.description}`);

    console.error('[MCP Server] Registering tool: deactivateUserHourlyRate');
    server.tool(
      deactivateUserHourlyRateTool.name,
      deactivateUserHourlyRateTool.inputSchema,
      deactivateUserHourlyRateTool.handler
    );
    console.error(`  - Description for deactivateUserHourlyRate: ${deactivateUserHourlyRateTool.description}`);

    console.error('[MCP Server] All tools registered.');

  } catch (regError) {
      console.error('[MCP Server] CRITICAL: Error during tool registration:', regError);
      process.exit(1);
  }
  
  // Handler dla `initialize` jest automatycznie obsługiwany przez McpServer.
  // Handlery dla `tools/list` i `tools/call` SĄ AUTOMATYCZNIE generowane przez McpServer
  // na podstawie narzędzi zarejestrowanych przez `server.tool()`.
  // Dlatego NIE używamy już `server.setRequestHandler(...)` dla tych metod.
  
  const transport = new StdioServerTransport();
  console.error('[MCP Server] Connecting transport...');
  await server.connect(transport);

  console.error(`[MCP Server] ${SERVER_NAME} v${SERVER_VERSION} running and connected via stdio.`);
  console.error('[MCP Server] Waiting for MCP client requests...');
}

main().catch((error) => {
  console.error('[MCP Server] Fatal error during server startup or operation:', error);
  process.exit(1);
});