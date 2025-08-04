// Test script for createInvoiceTool
// Usage: node test-createInvoiceTool.js

const tool = require('../src/tools/createInvoiceTool');

async function testTool() {
  console.log(`Testing ${tool.name}`);
  console.log('=======================================');
  
  // Define test arguments (no arguments needed for this tool)
  const testArgs = {};
  
  console.log('Input parameters:');
  console.log(JSON.stringify(testArgs, null, 2));
  
  try {
    const startTime = Date.now();
    const result = await tool.handler(testArgs);
    const endTime = Date.now();
    
    console.log('\nOutput:');
    console.log(JSON.stringify(result, null, 2));
    
    console.log(`\nExecution time: ${endTime - startTime} ms`);
    
    if (result && result.isError) {
      console.log('\n⚠️  Tool returned an error');
    } else {
      console.log('\n✅ Tool executed successfully');
    }
  } catch (error) {
    console.error('\n❌ Exception occurred:');
    console.error(error);
  }
}

testTool();
