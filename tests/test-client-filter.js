const getReportedTaskAggregatesTool = require('./src/tools/getReportedTaskAggregatesTool');

async function testClientFilter() {
  console.log('Testing getReportedTaskAggregates with clientName: "Masterlift"');
  
  try {
    const result = await getReportedTaskAggregatesTool.handler({
      clientName: 'Masterlift'
    });
    
    console.log('Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Also check how many records we got
    if (result && result.content && result.content[0] && result.content[0].text) {
      const data = JSON.parse(result.content[0].text);
      console.log(`\nNumber of records returned: ${data.length}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testClientFilter();
