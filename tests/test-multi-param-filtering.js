const getReportedTaskAggregatesTool = require('../src/tools/getReportedTaskAggregatesTool');

// Test the tool with multiple parameters
async function testMultiParamFiltering() {
  console.log('Testing getReportedTaskAggregatesTool with multiple parameters...');
  
  // Test 1: Month filter only
  console.log('\n=== Test 1: Month filter only ===');
  const testArgs1 = {
    limit: 100,
    month: 'lipiec'
  };
  
  console.log('Input arguments:', testArgs1);
  
  try {
    const result1 = await getReportedTaskAggregatesTool.handler(testArgs1);
    if (result1 && result1.content && Array.isArray(result1.content) && result1.content.length > 0) {
      const parsed = JSON.parse(result1.content[0].text);
      console.log(`Results count: ${parsed.length}`);
      
      // Count results by month
      const monthCounts = {};
      parsed.forEach(item => {
        const monthName = item.monthInTaskName || 'unknown';
        monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
      });
      console.log('Results by month:', monthCounts);
      
      // Verify all results are from 'lipiec'
      const allLipiec = Object.keys(monthCounts).length === 1 && monthCounts.lipiec > 0;
      console.log(`All results from 'lipiec': ${allLipiec ? 'PASS' : 'FAIL'}`);
    }
  } catch (error) {
    console.error('Error in Test 1:', error);
  }
  
  // Test 2: Month and client filter
  console.log('\n=== Test 2: Month and client filter ===');
  const testArgs2 = {
    limit: 100,
    month: 'lipiec',
    clientName: 'MOKO'  // Replace with an actual client from your data
  };
  
  console.log('Input arguments:', testArgs2);
  
  try {
    const result2 = await getReportedTaskAggregatesTool.handler(testArgs2);
    if (result2 && result2.content && Array.isArray(result2.content) && result2.content.length > 0) {
      const parsed = JSON.parse(result2.content[0].text);
      console.log(`Results count: ${parsed.length}`);
      
      // Count results by month and client
      const monthCounts = {};
      const clientCounts = {};
      parsed.forEach(item => {
        const monthName = item.monthInTaskName || 'unknown';
        const clientName = item.client || 'unknown';
        monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
      });
      console.log('Results by month:', monthCounts);
      console.log('Results by client:', clientCounts);
      
      // Verify all results are from 'lipiec' and client 'MOKO'
      const allLipiec = Object.keys(monthCounts).length === 1 && monthCounts.lipiec > 0;
      const allMOKO = Object.keys(clientCounts).length === 1 && clientCounts.MOKO > 0;
      console.log(`All results from 'lipiec': ${allLipiec ? 'PASS' : 'FAIL'}`);
      console.log(`All results from client 'MOKO': ${allMOKO ? 'PASS' : 'FAIL'}`);
    }
  } catch (error) {
    console.error('Error in Test 2:', error);
  }
  
  // Test 3: Month, client, and user filter
  console.log('\n=== Test 3: Month, client, and user filter ===');
  const testArgs3 = {
    limit: 100,
    month: 'lipiec',
    clientName: 'MOKO',
    userId: 87872985  // Replace with an actual user ID from your data
  };
  
  console.log('Input arguments:', testArgs3);
  
  try {
    const result3 = await getReportedTaskAggregatesTool.handler(testArgs3);
    if (result3 && result3.content && Array.isArray(result3.content) && result3.content.length > 0) {
      const parsed = JSON.parse(result3.content[0].text);
      console.log(`Results count: ${parsed.length}`);
      
      // Count results by month, client, and user
      const monthCounts = {};
      const clientCounts = {};
      const userCounts = {};
      parsed.forEach(item => {
        const monthName = item.monthInTaskName || 'unknown';
        const clientName = item.client || 'unknown';
        const userId = item.personClickUpId || 'unknown';
        monthCounts[monthName] = (monthCounts[monthName] || 0) + 1;
        clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
        userCounts[userId] = (userCounts[userId] || 0) + 1;
      });
      console.log('Results by month:', monthCounts);
      console.log('Results by client:', clientCounts);
      console.log('Results by user ID:', userCounts);
      
      // Verify all results are from 'lipiec', client 'MOKO', and the specified user
      const allLipiec = Object.keys(monthCounts).length === 1 && monthCounts.lipiec > 0;
      const allMOKO = Object.keys(clientCounts).length === 1 && clientCounts.MOKO > 0;
      const allUser = Object.keys(userCounts).length === 1 && userCounts[87872985] > 0;
      console.log(`All results from 'lipiec': ${allLipiec ? 'PASS' : 'FAIL'}`);
      console.log(`All results from client 'MOKO': ${allMOKO ? 'PASS' : 'FAIL'}`);
      console.log(`All results from user ID 87872985: ${allUser ? 'PASS' : 'FAIL'}`);
    }
  } catch (error) {
    console.error('Error in Test 3:', error);
  }
}

// Run the tests
testMultiParamFiltering();
