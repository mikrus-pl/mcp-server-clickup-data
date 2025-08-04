// Test script for getReportedTaskAggregatesTool
// Usage: node test-getReportedTaskAggregatesTool.js [--client <clientName>] [--user <userId>] [--month <monthName>] [--limit <limit>]

const tool = require('../src/tools/getReportedTaskAggregatesTool');

async function testTool() {
  console.log(`Testing ${tool.name}`);
  console.log('=======================================');
  
  // Define test arguments
  const testArgs = {};
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--client':
        if (i + 1 < args.length) {
          testArgs.clientName = args[i + 1];
          i++; // Skip the next argument
        }
        break;
      case '--user':
        if (i + 1 < args.length) {
          testArgs.userId = parseInt(args[i + 1]);
          i++; // Skip the next argument
        }
        break;
      case '--month':
        if (i + 1 < args.length) {
          testArgs.month = args[i + 1];
          i++; // Skip the next argument
        }
        break;
      case '--limit':
        if (i + 1 < args.length) {
          testArgs.limit = parseInt(args[i + 1]);
          i++; // Skip the next argument
        }
        break;
    }
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
