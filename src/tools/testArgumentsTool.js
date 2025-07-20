// src/tools/testArgumentsTool.js
module.exports = {
    name: 'testArguments',
    description: 'A simple tool to test argument passing from MCP Inspector. Accepts a string and a boolean.',
    inputSchema: {
      type: 'object',
      properties: {
        testString: {
          type: 'string',
          description: 'A test string input.'
        },
        testBoolean: {
          type: 'boolean',
          description: 'A test boolean input.'
        }
      },
      required: ['testString'] // Uczyńmy testString wymaganym
    },
    handler: async (args) => {
      const safeArgs = args || {};
      console.error(`[MCP Tool: testArguments] Received arguments:`, JSON.stringify(safeArgs));
  
      const { testString, testBoolean } = safeArgs;
  
      if (testString === undefined) { // Sprawdźmy, czy wymagany argument dotarł
          return {
              isError: true,
              content: [{ type: 'text', text: 'Error: testString argument is required but was not provided.' }],
          };
      }
  
      const responseText = `Received testString: "${testString}", testBoolean: ${testBoolean === undefined ? '(not provided)' : testBoolean}.`;
      
      return {
        content: [{ type: 'text', text: responseText }],
      };
    },
  };