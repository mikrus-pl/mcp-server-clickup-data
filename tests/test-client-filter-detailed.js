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
      try {
        const data = JSON.parse(result.content[0].text);
        console.log(`\nNumber of records returned: ${data.length}`);
      } catch (parseError) {
        console.log(`\nResponse text (not JSON): ${result.content[0].text}`);
        console.log(`Text length: ${result.content[0].text.length}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n--- Testing with trailing space ---');
  
  try {
    const result2 = await getReportedTaskAggregatesTool.handler({
      clientName: 'Masterlift '
    });
    
    console.log('Result with trailing space:');
    console.log(JSON.stringify(result2, null, 2));
    
    // Also check how many records we got
    if (result2 && result2.content && result2.content[0] && result2.content[0].text) {
      try {
        const data = JSON.parse(result2.content[0].text);
        console.log(`\nNumber of records returned: ${data.length}`);
      } catch (parseError) {
        console.log(`\nResponse text (not JSON): ${result2.content[0].text}`);
        console.log(`Text length: ${result2.content[0].text.length}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  
  console.log('\n--- Testing without any filter ---');
  
  try {
    const result3 = await getReportedTaskAggregatesTool.handler({});
    
    console.log('Result without filter:');
    // console.log(JSON.stringify(result3, null, 2));
    
    // Also check how many records we got
    if (result3 && result3.content && result3.content[0] && result3.content[0].text) {
      try {
        const data = JSON.parse(result3.content[0].text);
        console.log(`\nNumber of records returned: ${data.length}`);
      } catch (parseError) {
        console.log(`\nResponse text (not JSON): ${result3.content[0].text}`);
        console.log(`Text length: ${result3.content[0].text.length}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testClientFilter();
