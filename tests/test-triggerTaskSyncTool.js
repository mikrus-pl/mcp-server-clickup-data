// Test script for triggerTaskSyncTool
// Usage: node test-triggerTaskSyncTool.js [fullSync] [archived]

const tool = require('../src/tools/triggerTaskSyncTool');

async function testTool() {
  console.log(`Testing ${tool.name}`);
  console.log('=======================================');
  
  // Define test arguments
  const testArgs = {};
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] === 'true') {
    testArgs.fullSync = true;
  }
  if (args.length > 1 && args[1] === 'true') {
    testArgs.archived = true;
  }
  
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
