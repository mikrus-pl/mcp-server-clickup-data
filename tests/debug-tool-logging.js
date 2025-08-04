const getReportedTaskAggregatesTool = require('../src/tools/getReportedTaskAggregatesTool');

// Test the tool handler directly with the same parameters that were causing issues
async function testTool() {
  console.log('Testing getReportedTaskAggregatesTool with month filter...');
  
  const testArgs = {
    limit: 5000,
    month: 'lipiec'
  };
  
  console.log('Input arguments:', testArgs);
  
  try {
    const result = await getReportedTaskAggregatesTool.handler(testArgs);
    console.log('Tool execution completed.');
    console.log('Result type:', typeof result);
    
    if (result && result.content) {
      console.log('Content type:', typeof result.content);
      if (Array.isArray(result.content) && result.content.length > 0) {
        console.log('First content item type:', typeof result.content[0]);
        if (result.content[0].type === 'text') {
          // Try to parse the JSON to see what we get
          try {
            const parsed = JSON.parse(result.content[0].text);
            console.log('Parsed result count:', parsed.length);
            
            // Count results by month
            const monthCounts = {};
            parsed.forEach(item => {
              const monthName = item.monthInTaskName || 'unknown';
              monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
            });
            console.log('Results by month:', monthCounts);
          } catch (parseError) {
            console.log('Could not parse result as JSON:', result.content[0].text.substring(0, 200) + '...');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error during tool test:', error);
  }
}

// Run the test
testTool();
