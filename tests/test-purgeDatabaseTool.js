// Test script for purgeDatabaseTool
// Usage: node test-purgeDatabaseTool.js

const tool = require('../src/tools/purgeDatabaseTool');

async function testTool() {
  console.log(`Testing ${tool.name}`);
  console.log('=======================================');
  
  // Define test arguments (no arguments needed for this tool)
  const testArgs = {};
  
  console.log('Input parameters:');
  console.log(JSON.stringify(testArgs, null, 2));
  
  console.log('\n⚠️  WARNING: This tool will purge the database!');
  console.log('Please confirm you want to proceed.');
  
  // For safety, we won't actually execute this tool in the test script
  console.log('\nSkipping execution for safety reasons.');
  return;
  
  /* Uncomment the following lines to actually test the tool:
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
  */
}

testTool();
