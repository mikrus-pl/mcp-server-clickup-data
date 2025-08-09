# TOOLS\_REGISTRATIONR\_RULES.md

Zasady i wzorce rejestracji narzędzi (tools) dla serwera Model Context Protocol (MCP) w Node.js, z naciskiem na **nowoczesny wariant** rejestracji przez `registerTool()` oraz poprawne definiowanie schematów wejścia.

---

## 1) TL;DR

- **Używaj **`` zamiast starszego `tool(...)`.
- ``** musi być w Zod** (mapa pól → `zod`) — SDK generuje JSON Schema **z Zod**, nie odwrotnie.
- Jeśli masz **JSON Schema**, **przekonwertuj** je na Zod przy rejestracji.
- **Handler** dostaje już sparsowane argumenty (`args`) zgodne z `inputSchema` — **nie owijaj** go we własną logikę, która grzebie w `params.arguments`.
- Ustal ``, `` i ``; nie wrzucaj schematu do `annotations`.

---

## 2) Kontekst problemu

Objaw: `tools/list` zwracało `inputSchema.properties: {}` dla narzędzi, mimo że w module narzędzia zdefiniowane były właściwości (np. `clientName`, `userId`, `month`, `limit`).

Przyczyny:

1. **Mylenie overloadów** starszej metody `tool(...)` — trzeci argument bywa interpretowany jako **annotations**, a nie **input schema**. Skutkiem było przenoszenie pól do `annotations`, a `inputSchema` pozostawał pusty.
2. ``** oczekuje Zod**, a nie surowego JSON Schema. Podanie JSON Schema powoduje, że SDK nie ma z czego wygenerować `inputSchema`, więc ląduje `{}`.

---

## 3) Reguły poprawnej rejestracji (nowoczesny wariant)

### 3.1. Użyj `registerTool()`

```js
server.registerTool(
  toolName,
  {
    title: 'Human-readable title',
    description: 'What the tool does...'
    // kluczowy punkt: inputSchema w Zod (mapa pól)
    inputSchema: {
      clientName: z.string().describe('Filter by client name').optional(),
      userId: z.number().int().describe('ClickUp User ID').optional(),
      month: z.string().describe('Polish month name').optional(),
      limit: z.number().int().describe('Row limit').default(1000),
    },
  },
  async (args) => {
    return await handler(args);
  }
);
```

### 3.2. Jeśli posiadasz JSON Schema → konwertuj do Zod

- SDK generuje JSON Schema **z Zod**.
- W projekcie zastosowano lekką konwersję JSON Schema → **mapy pól Zod** (wystarczającą dla typów: `string`, `integer`, `number`, `boolean`, `array`, `object`, `enum`, `default`, `description`).

Minimalna funkcja konwersji (fragment):

```js
function jsonPropToZod(prop, required) {
  let node;
  if (prop.enum) {
    const vals = prop.enum;
    node = vals.every((v) => typeof v === 'string')
      ? z.enum(vals)
      : z.union(vals.map((v) => z.literal(v)));
  } else {
    switch (prop.type) {
      case 'string':  node = z.string(); break;
      case 'integer': node = z.number().int(); break;
      case 'number':  node = z.number(); break;
      case 'boolean': node = z.boolean(); break;
      case 'array':   node = z.array(jsonPropToZod(prop.items || {}, true)); break;
      case 'object':  node = z.object(jsonSchemaToZodFieldMap(prop), {
        unknownKeys: prop.additionalProperties === false ? 'strict' : 'passthrough'
      }); break;
      default:        node = z.any();
    }
  }
  if (prop.description) node = node.describe(prop.description);
  if (Object.prototype.hasOwnProperty.call(prop, 'default')) return node.default(prop.default);
  return required ? node : node.optional();
}
```

### 3.3. Handler nie wymaga manualnego „wyciągania” argumentów

Prawidłowy handler:

```js
server.registerTool(name, { title, description, inputSchema }, async (args) => {
  // args = już sparsowane argumenty zgodne z inputSchema
  return await toolModule.handler(args);
});
```

**Błąd** (nie robić):

```js
async (params) => {
  // NIE: re-parse params.arguments
  const args = params?.arguments || {};
  ...
}
```

### 3.4. `additionalProperties`

- W JSON Schema można wymusić `additionalProperties: false`.
- W Zod odpowiednikiem jest `z.object(shape, { unknownKeys: 'strict' })`.
- Uwaga: przy rejestracji przez **mapę pól Zod** (nie `z.object`) SDK domyślnie traktuje pola jako znane, a resztę odrzuci — zachowanie jest bezpieczne. Jeśli zależy Ci na ścisłym odzwierciedleniu, zbuduj jawnie `z.object(shape, { unknownKeys: 'strict' })` i użyj jego `.shape()` jako mapy.

---

## 4) Wzorce i przykłady

### 4.1. Moduł narzędzia (CommonJS)

```js
// ./src/tools/getReportedTaskAggregatesTool.js
const inputSchema = {
  type: 'object',
  properties: {
    clientName: { type: 'string', description: 'Filter by client name (case-insensitive).' },
    userId:     { type: 'integer', description: 'ClickUp User ID.' },
    month:      { type: 'string', description: 'Polish month name (e.g., "kwiecień").' },
    limit:      { type: 'integer', description: 'Limit rows.', default: 1000 },
  },
  additionalProperties: false,
};

module.exports = {
  name: 'getReportedTaskAggregates',
  description: 'Retrieves aggregated task time report from the database...',
  inputSchema,
  async handler(args) {
    // args.clientName, args.userId, args.month, args.limit
    // ... logika narzędzia ...
    return { content: [{ type: 'text', text: 'OK' }] };
  }
};
```

### 4.2. Serwer MCP — szkic rejestracji z konwersją

```js
server.registerTool(
  tool.name,
  {
    title: tool.title || humanTitle(tool.name),
    description: tool.description,
    inputSchema: normalizeInputSchema(tool.inputSchema), // Zod map
  },
  async (args) => tool.handler(args)
);
```

`normalizeInputSchema`:

```js
function normalizeInputSchema(schema) {
  if (isZodType(schema)) {
    const shape = schema._def?.shape?.();
    return shape || {};
  }
  if (isZodFieldMap(schema)) return schema;
  if (isJsonSchemaObject(schema)) return jsonSchemaToZodFieldMap(schema);
  return {};
}
```

---

## 5) COMMON MISTAKES (częste błędy)

1. **Zły overload **``:

   - Użycie `tool(name, description, schema, handler)` → w wielu wersjach SDK `description` ląduje jako **annotations**, a nie `inputSchema`. Skutek: puste `inputSchema` w `tools/list`.
   - Rozwiązanie: przejść na `registerTool()`.

2. **Podawanie JSON Schema do **``:

   - `registerTool()` oczekuje Zod. Podanie JSON Schema kończy się `{ properties: {} }`.
   - Rozwiązanie: konwertuj JSON Schema → Zod (mapa pól) przy rejestracji.

3. **Ręczne parsowanie **``** w handlerze**:

   - Niepotrzebne i mylące. SDK już waliduje i dostarcza `args` wg schematu.

4. **Brak **``** mimo wzmianki w opisie**:

   - Sam opis nie wymusza wartości domyślnej. Użyj `zod.default(...)` lub `default` w JSON Schema (jeśli konwertujesz do Zod).

5. **Nieścisłość **``:

   - JSON Schema z `additionalProperties: false` nie ma automatycznego odpowiednika, jeśli podasz tylko mapę pól Zod bez `z.object(..., { unknownKeys: 'strict' })`.
   - Jeśli to istotne, zbuduj `z.object` jawnie.

6. **Niedopasowane typy (np. **``** vs. **``**)**:

   - W Zod używaj `.int()` dla liczb całkowitych.

7. **Brakujące atrybuty modułu narzędzia**:

   - Każdy moduł musi eksportować `name`, `description`, `handler`. `inputSchema` jest zalecane (inaczej UI klientów nie wyświetli formularzy).

---

## 6) Procedura testów i walidacji

1. **Start serwera** i obserwacja logów: każde narzędzie powinno wypisać `✓ Registered`.
2. `` w Inspektorze MCP — sprawdź, czy `inputSchema.properties` ma Twoje pola.
3. **Wywołanie narzędzia** z poprawnymi i błędnymi danymi:
   - Sprawdź, że walidacja Zod odrzuca złe typy (np. `userId: "abc"`).
   - Sprawdź `default` (np. pominięty `limit` → 1000).
4. **Smoke test logiki** — czy handler zwraca oczekiwany kształt odpowiedzi MCP (`content: [{ type: 'text', text: '...' }]`).

---

## 7) Migracja ze starego kodu

- **Było:**
  - `server.tool(name, description, inputSchema, handler)` + ręczne parsowanie `params.arguments`.
- **Jest:**
  - `server.registerTool(name, { title, description, inputSchema: <Zod map> }, (args) => handler(args))`.
  - Jeśli `inputSchema` był JSON Schema → konwersja do Zod mapy pól.

Checklist migracji:

-

---

## 8) Minimalne szablony

### 8.1. Minimalny `server.js`

```js
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

async function main() {
  const server = new McpServer({ name: 'MyServer', version: '1.0.0' });

  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description: 'Echos back the provided message',
      inputSchema: { message: z.string().describe('Message to echo') },
    },
    async ({ message }) => ({ content: [{ type: 'text', text: message }] })
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### 8.2. Minimalny moduł narzędzia (JSON Schema → później konwersja)

```js
module.exports = {
  name: 'sum',
  description: 'Sums two integers',
  inputSchema: {
    type: 'object',
    properties: {
      a: { type: 'integer', description: 'Left operand' },
      b: { type: 'integer', description: 'Right operand' },
    },
    required: ['a', 'b'],
    additionalProperties: false,
  },
  async handler({ a, b }) {
    return { content: [{ type: 'text', text: String(a + b) }] };
  },
};
```

---

## 9) Troubleshooting

- ``** w **``
  - Sprawdź: czy `registerTool()` dostaje **Zod** (mapę pól), a nie JSON Schema?
  - Jeśli masz JSON Schema — czy działa konwersja na Zod?
- **Klient MCP nie pokazuje pól w UI**
  - Często wynika to z pustego `inputSchema` albo złej deklaracji typów (np. brak `.int()` przy integer).
- **Handler nie widzi argumentów**
  - Nie używaj `params.arguments`. Podpis `async (args) => { ... }` dostaje już dane zgodnie z `inputSchema`.
- **Walidacja nie blokuje śmieciowych pól**
  - Użyj `z.object(shape, { unknownKeys: 'strict' })` przy budowie schematu, jeśli to wymagane.

---

## 10) Decyzje projektowe (dlaczego tak)

- ``: Jednoznaczny, nowoczesny interfejs, który jasno rozdziela opis, tytuł i schemat wejścia (w Zod). Upraszcza integrację z klientami MCP.
- **Zod jako źródło prawdy**: SDK generuje JSON Schema z Zod, co gwarantuje spójność deklaracji typów z walidacją runtime.
- **Konwersja JSON Schema → Zod**: Pozwala zachować istniejące definicje narzędzi bez przepisywania całego kodu; konwersja minimalna, ale pokrywa najczęstsze przypadki.

---

**Uwagi końcowe**

- Ten dokument celowo zachowuje nazwę pliku `TOOLS_REGISTRATIONR_RULES.md` zgodnie z prośbą. W razie potrzeby zmień na `TOOLS_REGISTRATION_RULES.md`.
- Jeśli dodasz nowe typy do schematów (np. formaty dat), rozważ rozszerzenie konwertera JSON Schema → Zod o walidacje `regex`/`refine`.

