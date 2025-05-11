require('dotenv').config();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js'); // Poprawiony import zgodnie z exports
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js'); // Poprawiony import zgodnie z exports

// Import definicji narzędzi
const listUsersTool = require('./src/tools/listUsersTool');
const getReportedTaskAggregatesTool = require('./src/tools/getReportedTaskAggregatesTool');
const triggerDataCollectorSyncTool = require('./src/tools/triggerDataCollectorSyncTool');
const testArgumentsTool = require('./src/tools/testArgumentsTool'); // <--- NOWY IMPORT

const SERVER_NAME = process.env.MCP_SERVER_NAME || 'MyMCPDataServer';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.0.1';

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
    console.error('[MCP Server] Registering tool: listUsers');
    server.tool(
      listUsersTool.name,
      listUsersTool.inputSchema, // Przekazujemy JSON Schema
      listUsersTool.handler
    );
    // Dodajemy description do logu, bo SDK może go nie brać bezpośrednio z `tool`
    console.error(`  - Description for listUsers: ${listUsersTool.description}`);


    console.error('[MCP Server] Registering tool: getReportedTaskAggregates');
    server.tool(
      getReportedTaskAggregatesTool.name,
      getReportedTaskAggregatesTool.inputSchema,
      getReportedTaskAggregatesTool.handler
    );
    console.error(`  - Description for getReportedTaskAggregates: ${getReportedTaskAggregatesTool.description}`);

    console.error('[MCP Server] Registering tool: triggerDataCollectorSync');
    server.tool(
      triggerDataCollectorSyncTool.name,
      triggerDataCollectorSyncTool.inputSchema,
      triggerDataCollectorSyncTool.handler
    );
    console.error(`  - Description for triggerDataCollectorSync: ${triggerDataCollectorSyncTool.description}`);

    console.error('[MCP Server] All tools registered.');

  } catch (regError) {
      console.error('[MCP Server] CRITICAL: Error during tool registration:', regError);
      process.exit(1);
  }
  
  // Handler dla `initialize` jest automatycznie obsługiwany przez McpServer.
  // Handlery dla `tools/list` i `tools/call` SĄ AUTOMATYCZNIE generowane przez McpServer
  // na podstawie narzędzi zarejestrowanych przez `server.tool()`.
  // Dlatego usuwamy nasze `server.setRequestHandler(...)` dla tych metod.

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