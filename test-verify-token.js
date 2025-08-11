const axios = require('axios');

// Test the verify-token API implementation
async function testVerifyTokenAPI() {
  const baseURL = 'http://localhost:3000/api/users';
  
  try {
    console.log('🧪 Testing Verify Token API Implementation\n');
    
    // Test 1: Login to get a valid token
    console.log('1. Testing login to get a valid token...');
    const loginResponse = await axios.post(`${baseURL}/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      const token = loginResponse.data.token;
      console.log('Token received:', token.substring(0, 20) + '...\n');
      
      // Test 2: Verify the token
      console.log('2. Testing token verification...');
      const verifyResponse = await axios.post(`${baseURL}/verify-token`, {
        api_token: token
      });
      
      if (verifyResponse.data.success) {
        console.log('✅ Token verification successful');
        console.log('Response structure:');
        console.log('- success:', verifyResponse.data.success);
        console.log('- message:', verifyResponse.data.message);
        console.log('- data.api_token:', verifyResponse.data.data.api_token ? 'Present' : 'Missing');
        console.log('- data.refreshToken:', verifyResponse.data.data.refreshToken ? 'Present' : 'Missing');
        console.log('- user.id:', verifyResponse.data.user.id);
        console.log('- user.email:', verifyResponse.data.user.email);
        console.log('- user.role:', verifyResponse.data.user.role);
        console.log('- tokenInfo.validFor:', verifyResponse.data.tokenInfo.validFor);
      } else {
        console.log('❌ Token verification failed');
        console.log('Response:', verifyResponse.data);
      }
      
    } else {
      console.log('❌ Login failed');
      console.log('Response:', loginResponse.data);
    }
    
    // Test 3: Test with invalid token
    console.log('\n3. Testing with invalid token...');
    try {
      const invalidTokenResponse = await axios.post(`${baseURL}/verify-token`, {
        api_token: 'invalid.token.here'
      });
      console.log('❌ Invalid token should have failed');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Invalid token correctly rejected');
        console.log('Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 4: Test with missing token
    console.log('\n4. Testing with missing token...');
    try {
      const missingTokenResponse = await axios.post(`${baseURL}/verify-token`, {});
      console.log('❌ Missing token should have failed');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Missing token correctly rejected');
        console.log('Error message:', error.response.data.message);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testVerifyTokenAPI();
}

module.exports = { testVerifyTokenAPI };
