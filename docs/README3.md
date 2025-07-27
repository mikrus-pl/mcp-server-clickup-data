# MCP Server for ClickUp Data Collector (`mcp-server-clickup-data`)

---

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup and Configuration](#setup-and-configuration)
- [Running the Server](#running-the-server)
- [Testing with MCP Inspector](#testing-with-mcp-inspector)
- [Available MCP Tools](#available-mcp-tools)
  - [Data Retrieval Tools](#data-retrieval-tools-read-only-from-cdc-database)
  - [CDC Command Execution Tools](#cdc-command-execution-tools)
- [Error Handling](#error-handling)
- [Future Considerations / Potential Improvements](#future-considerations--potential-improvements)

---

## Overview

This project implements a Model Context Protocol (MCP) server designed to interact with the `clickup-data-collector` (CDC) application. The primary goal of this MCP server is to expose data collected and processed by CDC, as well as to trigger CDC's data synchronization operations, making them accessible to Language Model (LLM) clients via the MCP standard.

The server allows an LLM to:
- Read processed and aggregated time tracking data from the CDC's SQLite database.
- Trigger various data synchronization and management commands within the CDC application.

This enables interactive reporting, data querying using natural language (via an LLM), and automation of CDC workflows.

## Architecture

The `mcp-server-clickup-data` acts as an intermediary layer, providing a standardized MCP interface on top of the `clickup-data-collector`'s functionalities and its SQLite database.

```
@startuml
skinparam componentStyle uml2
hide footbox

package "LLM Client (e.g., MCP Inspector, Claude Desktop)" {
  [MCP Client]
}

package "MCP Server (mcp-server-clickup-data - This Project)" {
  [MCP Server Core (Node.js)]
  [MCP Tools]

  package "Database Access (Read-Only)" {
    [Knex.js]
    [SQLite Driver]
  }

  package "CDC Command Execution" {
    [Node.js child_process]
  }
}

package "ClickUp Data Collector (CDC - Separate Application)" {
  [CDC CLI (app.js)]
  [CDC SQLite DB (app_data.sqlite3)]
  [CDC Core Logic]
}

[MCP Client] ..> [MCP Server Core (Node.js)] : MCP (stdio)
[MCP Server Core (Node.js)] -> [MCP Tools] : Dispatches tool calls

[MCP Tools] ..> [Knex.js] : SQL Queries (Read-Only)
[Knex.js] -> [SQLite Driver]
[SQLite Driver] ..> [CDC SQLite DB (app_data.sqlite3)] : Reads data

[MCP Tools] ..> [Node.js child_process] : Executes CLI commands
[Node.js child_process] ..> [CDC CLI (app.js)] : Runs CDC commands
[CDC CLI (app.js)] -> [CDC Core Logic]
[CDC Core Logic] ..> [CDC SQLite DB (app_data.sqlite3)] : Reads/Writes data
@enduml
```

### Core Components
- **MCP Client:** Any application compliant with the Model Context Protocol that can connect to an MCP server (e.g., MCP Inspector, an LLM-powered chat interface).
- **MCP Server Core (Node.js):** The main application written in Node.js, utilizing the `@modelcontextprotocol/sdk`. It handles MCP communication (initialization, message parsing, etc.) via the `stdio` transport.
- **MCP Tools:** The heart of this server. These are specific functions exposed over MCP that the LLM can invoke. They are categorized into:
  - Tools for Data Retrieval: Directly query the CDC's SQLite database in read-only mode using Knex.js.
  - Tools for CDC Command Execution: Trigger commands of the `clickup-data-collector` CLI application (`app.js`) using Node.js `child_process.exec`.
- **ClickUp Data Collector (CDC):** The existing standalone Node.js application responsible for fetching data from ClickUp, processing it, and storing it in an SQLite database (`app_data.sqlite3`). The MCP server interacts with its database and its CLI.

### Communication Flow
1. The MCP Client connects to the `mcp-server-clickup-data` via `stdio`.
2. The Client can request a list of available tools (`tools/list`).
3. The Client (often instructed by an LLM) can call a specific tool with arguments (`tools/call`).
4. If the tool is for data retrieval, the MCP server queries the CDC's SQLite database.
5. If the tool is for triggering a CDC command, the MCP server executes the `clickup-data-collector`'s `app.js` script as a subprocess with appropriate arguments. Output from the CDC (stdout, stderr) is captured and summarized in the tool's response.
6. The MCP server sends the tool's result (or error) back to the MCP Client.

## Prerequisites

- Node.js (v16+ recommended, tested with v22.2.0)
- NPM (comes with Node.js)
- A running and configured `clickup-data-collector` (CDC) application. This MCP server relies on the CDC's database and CLI script.

## Setup and Configuration

1. Clone this repository (or set up the project files).
2. Navigate to the project directory:
   ```bash
   cd mcp-server-clickup-data
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root of the `mcp-server-clickup-data` project. This file will store configuration, primarily paths to the CDC application and its database.

   **.env Example:**
   ```properties
   # Absolute or relative path to the SQLite database file of the clickup-data-collector app
   CDC_DATABASE_PATH=../clickup-data-collector/data/app_data.sqlite3

   # Absolute or relative path to the main script of the clickup-data-collector app
   CDC_APP_SCRIPT_PATH=../clickup-data-collector/app.js

   # Name and version for this MCP server (used during MCP initialization)
   MCP_SERVER_NAME=ClickUpDataServer
   MCP_SERVER_VERSION=0.1.0
   ```

   > **IMPORTANT:** Ensure the paths in `.env` correctly point to your `clickup-data-collector` installation. Relative paths are resolved from the `mcp-server-clickup-data` project root.

## Running the Server

To start the MCP server, run the following command from the `mcp-server-clickup-data` project root:

```bash
node server.js
```

The server will initialize and listen for MCP client connections on `stdio`. Log messages from the server (including output from CDC commands) will be printed to `stderr`. MCP protocol messages will be exchanged on `stdout`.

## Testing with MCP Inspector

The recommended way to test this server is using the [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector).

1. Ensure your `mcp-server-clickup-data` is running (`node server.js`).
2. In a *new* terminal window, run the MCP Inspector, pointing it to your server script:
   ```bash
   npx @modelcontextprotocol/inspector node /path/to/your/mcp-server-clickup-data/server.js
   ```
   Replace `/path/to/your/` with the actual absolute path to your `server.js` file.
3. The MCP Inspector UI will open. It should automatically connect to your server.
4. Navigate to the "Tools" tab in the Inspector. You should see the list of available tools.
5. You can select a tool, provide arguments (if any, based on its `inputSchema`), and click "Run Tool" to test its functionality.
6. Observe the "Tool Result" in the Inspector and the `stderr` output of your running `server.js` for detailed logs.

## Available MCP Tools

This server exposes the following tools to MCP clients:

### Data Retrieval Tools (Read-Only from CDC Database)

These tools directly query the SQLite database managed by the `clickup-data-collector`.

#### 1. `listUsers`
- **Description:** Lists all users found in the CDC database, along with their most recent/current hourly rate.
- **Input Schema:** None (empty object `{}`).
- **Handler Logic:**
  1. Queries the `Users` table in the CDC database.
  2. For each user, queries the `UserHourlyRates` table to find their latest active hourly rate (ordered by `effective_from_date` descending).
  3. Returns a JSON array of user objects, each including `clickup_user_id`, `username`, `email`, `is_active`, `current_hourly_rate`, and `rate_effective_from`.
- **Output:** A JSON string within an MCP `TextContent` object, containing the array of users.

#### 2. `getReportedTaskAggregates`
- **Description:** Retrieves aggregated task time report data from the CDC database. Supports filtering by client name, user ID, and month.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "clientName": { "type": "string", "description": "Optional. Filter by client name (exact match, case-insensitive)." },
      "userId": { "type": "integer", "description": "Optional. Filter by ClickUp User ID." },
      "month": { "type": "string", "pattern": "^\\d{4}-(0[1-9]|1[0-2])$", "description": "Optional. Filter by month of the parent task (YYYY-MM format). Note: Relies on 'extracted_month_from_parent_name' field in DB having a comparable format or the LLM providing a value that matches." },
      "limit": { "type": "integer", "description": "Optional. Limit the number of results. Defaults to 1000.", "default": 1000 }
    }
  }
  ```
- **Handler Logic:**
  1. Constructs a SQL query to the `ReportedTaskAggregates` table, joining with `Users` to get usernames.
  2. Applies filters for `clientName` (case-insensitive), `userId`, and `month` if provided.
  3. The `month` filter currently attempts a direct match or LIKE against the `extracted_month_from_parent_name` field; its effectiveness depends on the data format in that field.
  4. Limits the number of results.
  5. Returns a JSON array of aggregated task objects.
- **Output:** A JSON string within an MCP `TextContent` object, containing the array of aggregated task data.

### CDC Command Execution Tools

These tools trigger specific CLI commands of the `clickup-data-collector` application. The MCP server uses Node.js `child_process.exec` to run these commands. The `stdout` and `stderr` of the CDC process are captured and summarized in the tool's response to the LLM, while full logs are printed to the MCP server's `stderr`.

#### 3. `triggerUserSync`
- **Description:** Triggers the `sync-users` command in the CDC application to synchronize user data from ClickUp to the local database.
- **Input Schema:** None (empty object `{}`).
- **Handler Logic:**
  1. Executes `node <CDC_APP_SCRIPT_PATH> sync-users` in the CDC application's directory.
  2. Parses key information from CDC's `stdout` (e.g., number of new/updated users).
  3. Returns a summary message.
- **Output:** An MCP `TextContent` object with a summary of the operation (e.g., "CDC command 'sync-users' completed. Results: X new users, Y updated users.").

#### 4. `triggerTaskSync`
- **Description:** Triggers the `sync-tasks` command in CDC for a specific ClickUp List ID. Supports options for a full sync and including archived tasks.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "listId": { "type": "string", "description": "ClickUp List ID to synchronize tasks from." },
      "fullSync": { "type": "boolean", "description": "Optional. Perform a full synchronization. Defaults to false.", "default": false },
      "archived": { "type": "boolean", "description": "Optional. Include archived tasks. Defaults to false.", "default": false }
    },
    "required": ["listId"]
  }
  ```
- **Handler Logic:**
  1. Executes `node <CDC_APP_SCRIPT_PATH> sync-tasks --listId <listId> [--full-sync] [--archived]` in the CDC directory.
  2. Parses key information from CDC's `stdout` (e.g., tasks fetched, new/updated tasks in DB, warnings).
  3. Returns a summary message.
- **Output:** An MCP `TextContent` object with a summary of the task synchronization.

#### 5. `triggerAggregateGeneration`
- **Description:** Triggers the `generate-aggregates` command in CDC, typically after tasks have been synced. Can be filtered by List ID and User ID.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "listId": { "type": "string", "description": "Optional. ClickUp List ID to limit aggregate generation." },
      "userId": { "type": "integer", "description": "Optional. ClickUp User ID to limit aggregate generation." }
    }
  }
  ```
- **Handler Logic:**
  1. Executes `node <CDC_APP_SCRIPT_PATH> generate-aggregates [--listId <listId>] [--userId <userId>]` in the CDC directory.
  2. Parses key information from CDC's `stdout` (e.g., parent tasks found, aggregates generated/written, skipped tasks).
  3. Returns a summary message.
- **Output:** An MCP `TextContent` object with a summary of the aggregate generation.

#### 6. `triggerFullSync`
- **Description:** Triggers the `full-sync` command in CDC for a specific List ID. This command sequentially runs user sync, a full task sync for the list, and aggregate generation for that list.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "listId": { "type": "string", "description": "ClickUp List ID for the full synchronization." }
      // "archived": { "type": "boolean", ... } // If your CDC full-sync command supports this
    },
    "required": ["listId"]
  }
  ```
- **Handler Logic:**
  1. Executes `node <CDC_APP_SCRIPT_PATH> full-sync --listId <listId>` in the CDC directory.
  2. Returns a general success/failure message, as the detailed output comes from multiple sub-commands.
- **Output:** An MCP `TextContent` object indicating the completion status of the full sync.

#### 7. `purgeDatabase`
- **Description:** Triggers the `purge-data --confirm` command in CDC. This is a destructive operation that deletes all data from the CDC database. Requires explicit confirmation.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "confirm": { "type": "boolean", "description": "Must be set to true to confirm data purge.", "enum": [true] }
    },
    "required": ["confirm"]
  }
  ```
- **Handler Logic:**
  1. Checks if the `confirm` argument is `true`.
  2. If confirmed, executes `node <CDC_APP_SCRIPT_PATH> purge-data --confirm` in the CDC directory.
  3. Returns a message confirming the purge or stating that confirmation was not provided.
- **Output:** An MCP `TextContent` object with the result of the purge operation.

#### 8. `setUserHourlyRate`
- **Description:** Sets a new hourly rate for a specified user in the CDC application, effective from a given date.
- **Input Schema:**
  ```json
  {
    "type": "object",
    "properties": {
      "userId": { "type": "integer", "description": "The ClickUp User ID (numeric)." },
      "rate": { "type": "number", "description": "The new hourly rate (e.g., 30.50)." },
      "fromDate": { "type": "string", "pattern": "^\\d{4}-\\d{2}-\\d{2}$", "description": "Effective date (YYYY-MM-DD)." }
    },
    "required": ["userId", "rate", "fromDate"]
  }
  ```
- **Handler Logic:**
  1. Executes `node <CDC_APP_SCRIPT_PATH> user-rate set --userId <userId> --rate <rate> --fromDate <fromDate>` in the CDC directory.
  2. Returns a message confirming the rate update.
- **Output:** An MCP `TextContent` object confirming the action.

## Error Handling

- Errors originating from the MCP server itself (e.g., tool not found, invalid arguments before calling CDC) are returned as standard JSON-RPC errors.
- Errors originating from the execution of a CDC command (e.g., CDC script crashes, database errors within CDC) are captured by the MCP tool handler. The `isError` flag in the MCP tool result will be set to `true`, and the `content` will contain a summary of the error message from CDC's `stderr` or `error.message`.
- Full `stdout` and `stderr` from CDC commands are logged to the `stderr` of the `mcp-server-clickup-data` process for debugging purposes.

## Future Considerations / Potential Improvements

- **Structured Content Output:** For data retrieval tools, define `outputSchema` and return data as `structuredContent` instead of a JSON string in `TextContent`. This would make it easier for LLMs to parse and use the data.
- **Refined CDC Output Parsing:** More robust parsing of CDC command outputs to extract more detailed structured information for the LLM.
- **Direct Logic Invocation:** Refactor `clickup-data-collector` to expose its core logic synchronize/aggregation functions directly, so the MCP server can import and call them without relying on `child_process.exec`. This would improve performance and error handling.
- **HTTP Transport:** Implement an HTTP-based transport (e.g., Streamable HTTP as per MCP spec) for remote accessibility.
- **Authentication/Authorization:** If the server is exposed over HTTP, implement security measures.
- **More Granular Tools:** Break down existing tools further if LLMs struggle with their current scope or argument complexity.
