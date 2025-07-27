# CDC Commands Availability via MCP Server Tools

This analysis details which CDC (ClickUp Data Collector) commands are available through the MCP server tools and which are not. It includes information about parameters, their sources, and implementation details.

## Available CDC Commands via MCP Tools

### 1. sync-users
**MCP Tool**: `triggerUserSync`
**Availability**: ✅ Fully Available

**Parameters**:
- None (no parameters accepted from LLM/client)

**Implementation Details**:
- The tool executes the CDC command `node app.js sync-users`
- No parameters can be passed from the LLM/client to this tool
- All configuration comes from the server environment (`CDC_APP_SCRIPT_PATH`)

### 2. sync-tasks
**MCP Tool**: `triggerTaskSync`
**Availability**: ✅ Fully Available

**Parameters**:
- `fullSync` (boolean, optional, default: false) - Provided by LLM/client
- `archived` (boolean, optional, default: false) - Provided by LLM/client

**Environment Variable**:
- `CLICKUP_LIST_ID` (string, required) - Loaded from server environment

**Implementation Details**:
- The tool executes the CDC command `node app.js sync-tasks --listId "<CLICKUP_LIST_ID>" [--full-sync] [--archived]`
- The `listId` parameter is loaded from the `CLICKUP_LIST_ID` environment variable
- Other parameters are provided by the LLM/client calling the tool
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

### 3. user-rate set
**MCP Tool**: `setUserHourlyRate`
**Availability**: ✅ Fully Available

**Parameters**:
- `userId` (integer, required) - Provided by LLM/client
- `rate` (number, required) - Provided by LLM/client
- `fromDate` (string, required, format: YYYY-MM-DD) - Provided by LLM/client

**Implementation Details**:
- The tool executes the CDC command `node app.js user-rate set --userId <userId> --rate <rate> --fromDate "<fromDate>"`
- All parameters are provided by the LLM/client calling the tool
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

### 4. full-sync
**MCP Tool**: `triggerFullSync`
**Availability**: ✅ Fully Available

**Environment Variable**:
- `CLICKUP_LIST_ID` (string, required) - Loaded from server environment

**Implementation Details**:
- The tool executes the CDC command `node app.js full-sync --listId "<CLICKUP_LIST_ID>"`
- The `listId` parameter is loaded from the `CLICKUP_LIST_ID` environment variable
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

### 5. purge-data
**MCP Tool**: `purgeDatabase`
**Availability**: ✅ Fully Available

**Parameters**:
- `confirm` (boolean, required, must be true) - Provided by LLM/client

**Implementation Details**:
- The tool executes the CDC command `node app.js purge-data --confirm`
- The `confirm` parameter is provided by the LLM/client and must be explicitly set to `true`
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

### 6. Data Reading Commands
**MCP Tools**: `listUsers`, `getReportedTaskAggregates`
**Availability**: ✅ Fully Available

**Parameters for listUsers**:
- None

**Parameters for getReportedTaskAggregates**:
- `clientName` (string, optional) - Provided by LLM/client
- `userId` (integer, optional) - Provided by LLM/client
- `month` (string, optional, format: YYYY-MM) - Provided by LLM/client
- `limit` (integer, optional, default: 1000) - Provided by LLM/client

**Implementation Details**:
- These tools read data from the database rather than executing CDC commands
- All parameters are provided by the LLM/client
- Server configuration comes from environment (`CDC_DATABASE_PATH`)

## Partially Available CDC Commands

### 1. setup-db
**MCP Tool**: `triggerDataCollectorSync` (generic tool)
**Availability**: ⚠️ Partially Available

**Parameters**:
- `commandName` (string, required, must be "setup-db") - Provided by LLM/client

**Implementation Details**:
- Available through the generic `triggerDataCollectorSync` tool
- The LLM/client must specify `commandName: "setup-db"`
- No additional parameters are supported
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

### 2. generate-aggregates
**MCP Tool**: `triggerDataCollectorSync` (generic tool) or `getReportedTaskAggregates` (for reading)
**Availability**: ⚠️ Partially Available

**Parameters for execution**:
- `commandName` (string, required, must be "generate-aggregates") - Provided by LLM/client
- `userId` (integer, optional) - Not directly supported, would need to use generic tool

**Environment Variable**:
- `CLICKUP_LIST_ID` (string, required for this command) - Loaded from server environment

**Implementation Details**:
- Available through the generic `triggerDataCollectorSync` tool
- The LLM/client must specify `commandName: "generate-aggregates"`
- The `listId` parameter is loaded from the `CLICKUP_LIST_ID` environment variable
- No direct parameter for `userId` filtering (would need to be implemented)
- Server configuration comes from environment (`CDC_APP_SCRIPT_PATH`)

## Not Available CDC Commands

### 1. user-rate list
**Availability**: ❌ Not Available

**Reason**: No MCP tool has been implemented to execute `node app.js user-rate list --userId <userId>`

### 2. user-rate deactivate
**Availability**: ❌ Not Available

**Reason**: No MCP tool has been implemented to execute `node app.js user-rate deactivate --rateId <rateId>`

### 3. purge-logs
**Availability**: ❌ Not Available

**Reason**: No MCP tool has been implemented to execute `node app.js purge-logs --confirm`

## Parameter Sources Summary

| Parameter Source | Description | Examples |
|------------------|-------------|----------|
| LLM/Client | Parameters provided by the LLM when calling the MCP tool | `listId`, `userId`, `rate`, `fromDate`, `confirm` |
| Server Environment | Configuration values set in the MCP server's .env file | `CDC_APP_SCRIPT_PATH`, `CDC_DATABASE_PATH` |
| Hardcoded | Values that are fixed in the tool implementation | Command names like `sync-users`, `full-sync` |

## Recommendations

1. **Implement missing tools**: Create specific MCP tools for `user-rate list`, `user-rate deactivate`, and `purge-logs` commands
2. **Enhance existing tools**: Add `userId` parameter support to the generic tool for `generate-aggregates` command
3. **Improve documentation**: Add more detailed descriptions of parameter usage in the tool schemas
4. **Consider specialized tools**: Instead of relying solely on the generic `triggerDataCollectorSync`, consider creating specialized tools for each CDC command for better clarity and control
