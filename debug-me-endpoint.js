const axios = require('axios');

async function debugMeEndpoint() {
  const baseURL = 'http://localhost:3000/api/users';
  
  console.log('🔍 Debugging /api/users/me endpoint issues\n');
  
  try {
    // Step 1: Test if the server is responding
    console.log('1. Testing server connectivity...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/api/users/login', {
        validateStatus: () => true // Accept any status code
      });
      console.log(`✅ Server is responding (Status: ${healthResponse.status})`);
    } catch (error) {
      console.log('❌ Server is not responding:', error.message);
      return;
    }
    
    // Step 2: Create a test user
    console.log('\n2. Creating/using test user...');
    try {
      const registerResponse = await axios.post(`${baseURL}/register`, {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'guest'
      });
      
      if (registerResponse.data.success) {
        console.log('✅ Test user created successfully!');
      }
    } catch (regError) {
      if (regError.response?.data?.message?.includes('already in use')) {
        console.log('✅ Test user already exists, continuing...');
      } else {
        console.log('❌ Registration failed:', regError.response?.data?.message || regError.message);
        return;
      }
    }
    
    // Step 3: Login to get a valid token
    console.log('\n3. Getting authentication token...');
    let token = null;
    try {
      const loginResponse = await axios.post(`${baseURL}/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      
      if (loginResponse.data.success && loginResponse.data.token) {
        token = loginResponse.data.token;
        console.log('✅ Login successful!');
        console.log(`   Token: ${token.substring(0, 30)}...`);
      } else {
        console.log('❌ Login failed:', loginResponse.data);
        return;
      }
    } catch (loginError) {
      console.log('❌ Login request failed:', loginError.response?.data?.message || loginError.message);
      return;
    }
    
    // Step 4: Test /me endpoint without authentication
    console.log('\n4. Testing /me endpoint without authentication...');
    try {
      const noAuthResponse = await axios.get(`${baseURL}/me`, {
        validateStatus: () => true
      });
      console.log(`   Status: ${noAuthResponse.status}`);
      console.log(`   Response: ${JSON.stringify(noAuthResponse.data)}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Step 5: Test /me endpoint with invalid token
    console.log('\n5. Testing /me endpoint with invalid token...');
    try {
      const invalidTokenResponse = await axios.get(`${baseURL}/me`, {
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        },
        validateStatus: () => true
      });
      console.log(`   Status: ${invalidTokenResponse.status}`);
      console.log(`   Response: ${JSON.stringify(invalidTokenResponse.data)}`);
    } catch (error) {
      console.log(`   Error: ${error.message}`);
    }
    
    // Step 6: Test /me endpoint with valid token
    console.log('\n6. Testing /me endpoint with valid token...');
    try {
      const meResponse = await axios.get(`${baseURL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        validateStatus: () => true
      });
      
      console.log(`   Status: ${meResponse.status}`);
      
      if (meResponse.status === 200 && meResponse.data.success) {
        console.log('✅ /me endpoint working correctly!');
        console.log('   User data received:');
        console.log(`     ID: ${meResponse.data.user._id}`);
        console.log(`     Name: ${meResponse.data.user.fullName}`);
        console.log(`     Email: ${meResponse.data.user.email}`);
        console.log(`     Role: ${meResponse.data.user.role}`);
      } else {
        console.log('❌ /me endpoint failed:');
        console.log(`   Response: ${JSON.stringify(meResponse.data, null, 2)}`);
      }
    } catch (error) {
      console.log('❌ /me endpoint request failed:', error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    // Step 7: Test verify-token endpoint (our new implementation)
    console.log('\n7. Testing verify-token endpoint for comparison...');
    try {
      const verifyResponse = await axios.post(`${baseURL}/verify-token`, {
        api_token: token
      }, {
        validateStatus: () => true
      });
      
      console.log(`   Status: ${verifyResponse.status}`);
      if (verifyResponse.data.success) {
        console.log('✅ verify-token endpoint working correctly!');
      } else {
        console.log('❌ verify-token failed:', verifyResponse.data.message);
      }
    } catch (error) {
      console.log('❌ verify-token request failed:', error.message);
    }
    
    // Step 8: Check all available routes
    console.log('\n8. Testing other user routes...');
    const routesToTest = [
      { method: 'POST', path: '/login', description: 'Login' },
      { method: 'POST', path: '/register', description: 'Register' },
      { method: 'POST', path: '/verify-token', description: 'Verify Token' }
    ];
    
    for (const route of routesToTest) {
      try {
        if (route.method === 'POST') {
          const testResponse = await axios.post(`${baseURL}${route.path}`, {}, {
            validateStatus: () => true
          });
          console.log(`   ${route.description}: ${testResponse.status} (${testResponse.status < 500 ? 'Route exists' : 'Server error'})`);
        }
      } catch (error) {
        console.log(`   ${route.description}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Debug test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  console.log('\n✨ Debug test completed!');
}

// Run the debug test
debugMeEndpoint();
