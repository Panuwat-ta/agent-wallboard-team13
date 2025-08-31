// test-api.js - Simple API testing script
const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Helper function for HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') 
              ? JSON.parse(data) : data
          });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data, error });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

// Test cases
async function runTests() {
  console.log('🧪 Starting API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Check...');
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/health',
      method: 'GET'
    });
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${healthResponse.data.status}\n`);

    // Test 2: Get All Agents
    console.log('2. Testing Get All Agents...');
    const agentsResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/agents',
      method: 'GET'
    });
    console.log(`   Status: ${agentsResponse.statusCode}`);
    console.log(`   Agents Count: ${agentsResponse.data.data?.agents?.length || 0}\n`);

    // Test 3: Agent Login
    console.log('3. Testing Agent Login...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/agents/A999/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      agentCode: 'A999',
      name: 'Test Agent',
      skills: ['Testing', 'API'],
      supervisor: 'S001',
      department: 'QA'
    });
    console.log(`   Status: ${loginResponse.statusCode}`);
    console.log(`   Success: ${loginResponse.data.success}\n`);

    // Test 4: Update Agent Status
    console.log('4. Testing Agent Status Update...');
    const statusResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/agents/A999/status',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      status: 'Active',
      reason: 'Taking calls'
    });
    console.log(`   Status: ${statusResponse.statusCode}`);
    console.log(`   Success: ${statusResponse.data.success}\n`);

    // Test 5: Send Message
    console.log('5. Testing Send Message...');
    const messageResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }, {
      from: 'supervisor_test',
      fromName: 'Test Supervisor',
      to: 'A999',
      message: 'This is a test message from API testing',
      type: 'instruction',
      priority: 'normal'
    });
    console.log(`   Status: ${messageResponse.statusCode}`);
    console.log(`   Success: ${messageResponse.data.success}\n`);

    // Test 6: Get Dashboard Stats
    console.log('6. Testing Dashboard Stats...');
    const dashboardResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/dashboard/stats',
      method: 'GET'
    });
    console.log(`   Status: ${dashboardResponse.statusCode}`);
    console.log(`   Online Agents: ${dashboardResponse.data.data?.agents?.online || 0}`);
    console.log(`   Total Messages: ${dashboardResponse.data.data?.messages?.total || 0}\n`);

    // Test 7: Agent Logout
    console.log('7. Testing Agent Logout...');
    const logoutResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/agents/A999/logout',
      method: 'POST'
    });
    console.log(`   Status: ${logoutResponse.statusCode}`);
    console.log(`   Success: ${logoutResponse.data.success}\n`);

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if server is running
runTests();