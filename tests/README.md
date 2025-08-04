# MCP Tools Test Scripts

This directory contains simple test scripts for each MCP tool. These scripts allow you to test tool invocation, view parameters used, returned results, and potential errors.

## Usage

Before running any test scripts, make sure you have set up your environment variables in a `.env` file based on the `.env.example` file in the project root.

To run a test script, use Node.js:

```bash
node test-<tool-name>.js [arguments]
```

## Test Scripts

| Tool Name | Test Script | Arguments |
|-----------|-------------|-----------|
| triggerTaskSyncTool | test-triggerTaskSyncTool.js | [fullSync] [archived] |
| triggerFullSyncTool | test-triggerFullSyncTool.js | (no arguments) |
| triggerDataCollectorSyncTool | test-triggerDataCollectorSyncTool.js | (no arguments) |
| listUsersTool | test-listUsersTool.js | (no arguments) |
| getReportedTaskAggregatesTool | test-getReportedTaskAggregatesTool.js | [clientName] |
| purgeDatabaseTool | test-purgeDatabaseTool.js | (no arguments) |
| listUserHourlyRatesTool | test-listUserHourlyRatesTool.js | [userId] |
| setUserHourlyRateTool | test-setUserHourlyRateTool.js | [userId] [hourlyRate] |
| deactivateUserHourlyRateTool | test-deactivateUserHourlyRateTool.js | [rateId] |
| listInvoicesTool | test-listInvoicesTool.js | (no arguments) |
| createInvoiceTool | test-createInvoiceTool.js | (no arguments) |

## Examples

```bash
# Test triggerTaskSyncTool with full sync and archived tasks
node test-triggerTaskSyncTool.js true true

# Test getReportedTaskAggregatesTool for a specific client
node test-getReportedTaskAggregatesTool.js "Masterlift"

# Test listUserHourlyRatesTool for a specific user
node test-listUserHourlyRatesTool.js "user123"

# Test setUserHourlyRateTool for a specific user with a rate
node test-setUserHourlyRateTool.js "user123" 50.0

# Test deactivateUserHourlyRateTool with a specific rate ID
node test-deactivateUserHourlyRateTool.js "rate456"
```

## Output Information

Each test script will display:
1. The tool being tested
2. Input parameters used
3. The tool's output (results or errors)
4. Execution time
5. Success or error status

## Safety Notes

- The purgeDatabaseTool test script is disabled by default for safety reasons.
- Always ensure your environment variables are correctly set before running tests.
- Some tools may interact with external services (like ClickUp) and may incur usage charges.
