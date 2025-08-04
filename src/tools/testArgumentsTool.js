// src/tools/testArgumentsTool.js
const { z } = require('zod');

module.exports = {
    name: 'testArguments',
    description: 'A simple tool to test argument passing from MCP Inspector. Accepts a string and a boolean.',
    inputSchema: z.object({
      testString: z.string()
        .describe('A test string input.')
        .refine(val => !!val, 'testString is required'),
      testBoolean: z.boolean()
        .describe('A test boolean input.')
        .optional(),
    }),
    handler: async (args) => {
      const safeArgs = args || {};
      console.error(`[MCP Tool: testArguments] Received arguments:`, JSON.stringify(safeArgs));
  
      try {
        const parsedArgs = this.inputSchema.parse(safeArgs);
        const { testString: parsedTestString, testBoolean: parsedTestBoolean } = parsedArgs;
  
        const responseText = `Received testString: "${parsedTestString}", testBoolean: ${parsedTestBoolean === undefined ? '(not provided)' : parsedTestBoolean}.`;
        
        return {
          content: [{ type: 'text', text: responseText }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    },
  };