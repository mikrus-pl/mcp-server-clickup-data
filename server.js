// server.js — MCP server z registerTool() i konwersją JSON Schema → Zod
// Node 18+, CommonJS

require('dotenv').config();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const path = require('node:path');
const { z } = require('zod');

// --- Server meta -------------------------------------------------------------
const SERVER_NAME = process.env.MCP_SERVER_NAME || 'ClickUpDataServer';
const SERVER_VERSION = process.env.MCP_SERVER_VERSION || '0.1.0';

// --- Moduły narzędzi --------------------------------------------------------
const TOOL_MODULE_PATHS = [
  './src/tools/listUsersTool',
  './src/tools/triggerUserSyncTool',
  './src/tools/triggerTaskSyncTool',
  './src/tools/triggerFullSyncTool',
  './src/tools/purgeDatabaseTool',
  './src/tools/setUserHourlyRateTool',
  './src/tools/listUserHourlyRatesTool',
  './src/tools/deactivateUserHourlyRateTool',
  './src/tools/createInvoiceTool',
  './src/tools/listInvoicesTool',
  './src/tools/getReportedTaskAggregatesTool',
  './src/tools/triggerGenerateAggregatesTool',
];

// --- Utils ------------------------------------------------------------------
const log = (...a) => console.error('[MCP Server]', ...a);

const humanTitle = (name) =>
  (name || '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const isZodType = (v) => !!(v && typeof v === 'object' && v._def);
const isZodFieldMap = (obj) =>
  obj &&
  typeof obj === 'object' &&
  !obj._def &&
  Object.values(obj).length > 0 &&
  Object.values(obj).every((v) => isZodType(v));

const isJsonSchemaObject = (schema) =>
  schema && typeof schema === 'object' && schema.type === 'object' && typeof schema.properties === 'object';

// --- JSON Schema -> Zod -----------------------------------------------------
// Konwertuje JSO (object) do mapy pól { name: zodType }
function jsonSchemaToZodFieldMap(schema) {
  if (!isJsonSchemaObject(schema)) return {};
  const required = new Set(schema.required || []);
  const out = {};
  for (const [name, prop] of Object.entries(schema.properties || {})) {
    out[name] = jsonPropToZod(prop, required.has(name));
  }
  return out;
}

function jsonPropToZod(prop, required) {
  // Minimalna obsługa: string, integer, number, boolean, array, object, enum, default, description
  let node;

  if (!prop || typeof prop !== 'object') {
    node = z.any();
  } else if (prop.enum && Array.isArray(prop.enum) && prop.enum.length > 0) {
    const vals = prop.enum;
    if (vals.every((v) => typeof v === 'string')) node = z.enum(vals);
    else node = z.union(vals.map((v) => z.literal(v)));
  } else {
    switch (prop.type) {
      case 'string':
        node = z.string();
        break;
      case 'integer':
        node = z.number().int();
        break;
      case 'number':
        node = z.number();
        break;
      case 'boolean':
        node = z.boolean();
        break;
      case 'array': {
        const itemProp = prop.items || {};
        node = z.array(jsonPropToZod(itemProp, true));
        break;
      }
      case 'object': {
        const inner = isJsonSchemaObject(prop) ? jsonSchemaToZodFieldMap(prop) : {};
        node = z.object(inner, { unknownKeys: prop.additionalProperties === false ? 'strict' : 'passthrough' });
        break;
      }
      default:
        node = z.any();
    }
  }

  if (prop && typeof prop.description === 'string') {
    node = node.describe(prop.description);
  }
  if (prop && Object.prototype.hasOwnProperty.call(prop, 'default')) {
    // .default() czyni pole opcjonalnym z wartością domyślną
    node = node.default(prop.default);
    return node;
  }
  // Brak default → opcjonalność wg `required`
  if (!required) node = node.optional();
  return node;
}

function normalizeInputSchema(inputSchema) {
  // 1) Już Zod type (z.object(...)) → przyjmij jako mapa pól (unwrap)
  if (isZodType(inputSchema)) {
    // Użytkownicy czasem podają z.object({ ... }) — rozbij na mapę
    const shape = inputSchema._def && inputSchema._def.shape();
    if (shape && typeof shape === 'object') return shape;
    return {}; // nieobsługiwana forma
  }
  // 2) Mapa pól Zod
  if (isZodFieldMap(inputSchema)) return inputSchema;

  // 3) JSON Schema → konwersja
  if (isJsonSchemaObject(inputSchema)) return jsonSchemaToZodFieldMap(inputSchema);

  // 4) brak → puste
  return {};
}

function validateToolModule(mod, modPath) {
  if (!mod || typeof mod !== 'object') {
    throw new Error(`Module export is not an object: ${modPath}`);
  }
  const missing = [];
  if (!mod.name) missing.push('name');
  if (!mod.description) missing.push('description');
  if (!mod.handler) missing.push('handler');
  if (missing.length) throw new Error(`Missing required exports [${missing.join(', ')}] in ${modPath}`);
}

// --- Main -------------------------------------------------------------------
async function main() {
  log(`Initializing server: ${SERVER_NAME} v${SERVER_VERSION}`);
  log('=================================================');

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  log('Loading tool modules...');
  const registered = [];

  for (const modPath of TOOL_MODULE_PATHS) {
    try {
      const abs = path.resolve(modPath);
      const toolMod = require(abs);
      validateToolModule(toolMod, modPath);

      const toolName = toolMod.name;
      const title = toolMod.title || humanTitle(toolName);
      const description = toolMod.description;
      const inputSchema = normalizeInputSchema(toolMod.inputSchema);

      log(`\nRegistering tool: ${toolName}`);
      log(`  Title: ${title}`);
      log(`  Desc:  ${description?.slice(0, 120) || ''}${description && description.length > 120 ? '…' : ''}`);

      server.registerTool(
        toolName,
        { title, description, inputSchema },
        async (args, _ctx) => {
          try {
            return await toolMod.handler(args || {});
          } catch (err) {
            log(`✗ Handler error in ${toolName}:`, err?.stack || err?.message || err);
            return {
              isError: true,
              content: [{ type: 'text', text: `Tool '${toolName}' failed: ${err?.message || String(err)}` }],
            };
          }
        }
      );

      registered.push(toolName);
      log('  ✓ Registered');
    } catch (e) {
      log(`✗ ERROR loading/registering ${modPath}: ${e?.message || e}`);
    }
  }

  if (registered.length === 0) throw new Error('No tools registered. Aborting.');

  log('=================================================');
  log(`Registration complete. Tools: ${registered.length}`);
  registered.forEach((t) => log(`  • ${t}`));
  log('=================================================');

  const transport = new StdioServerTransport();
  log('Connecting stdio transport...');
  await server.connect(transport);

  log(`${SERVER_NAME} v${SERVER_VERSION} is running`);
  log('Ready to handle MCP client requests');
  log('=================================================\n');
}

main().catch((err) => {
  console.error('[MCP Server] Fatal startup error:', err?.stack || err?.message || err);
  process.exit(1);
});
