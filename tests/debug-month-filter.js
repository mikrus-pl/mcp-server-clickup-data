// Debug script for month filter issue
const tool = require('../src/tools/getReportedTaskAggregatesTool');

async function debugMonthFilter() {
  console.log('Testing with both limit and month parameters:');
  const args = { limit: 5000, month: 'lipiec' };
  console.log('Input args:', args);
  
  try {
    const result = await tool.handler(args);
    
    if (result.isError) {
      console.log('Error:', result.content[0].text);
      return;
    }
    
    // Parse the JSON response
    const data = JSON.parse(result.content[0].text);
    
    console.log(`\nFound ${data.length} records`);
    
    // Check what months are in the results
    const months = {};
    data.forEach(record => {
      const month = record.monthInTaskName;
      months[month] = (months[month] || 0) + 1;
    });
    
    console.log('Months in results:', months);
    
    // Show first few records
    console.log('\nFirst 3 records:');
    console.log(JSON.stringify(data.slice(0, 3), null, 2));
    
  } catch (error) {
    console.error('Exception:', error);
  }
}

debugMonthFilter();
