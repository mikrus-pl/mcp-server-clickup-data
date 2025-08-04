// Test script for listUserHourlyRatesTool
// Usage: node test-listUserHourlyRatesTool.js [userId]

const tool = require('../src/tools/listUserHourlyRatesTool');

async function testTool() {
  console.log(`Testing ${tool.name}`);
  console.log('=======================================');
  
  // Define test arguments
  const testArgs = {};
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.length > 0) {
    testArgs.userId = args[0];
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
