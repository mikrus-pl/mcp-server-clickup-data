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
    required: ['testString']
  },
    handler: async (args) => {
      const safeArgs = args || {};
      console.error(`[MCP Tool: testArguments] Received arguments:`, JSON.stringify(safeArgs));
      
      // Manual validation since we're not using Zod anymore
      if (!args || typeof args !== 'object') {
        return { 
          isError: true, 
          content: [{ type: 'text', text: 'Invalid input: args must be an object' }] 
        };
      }
      
      const { testString, testBoolean } = safeArgs;
      
      // Validate required field
      if (typeof testString !== 'string' || testString === '') {
        return { 
          isError: true, 
          content: [{ type: 'text', text: 'Invalid input: testString is required and must be a non-empty string' }] 
        };
      }
      
      // Validate optional field
      if (testBoolean !== undefined && typeof testBoolean !== 'boolean') {
        return { 
          isError: true, 
          content: [{ type: 'text', text: 'Invalid input: testBoolean must be a boolean' }] 
        };
      }
      
      const parsedTestString = testString;
      const parsedTestBoolean = testBoolean;
  
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