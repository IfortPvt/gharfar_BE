const axios = require('axios');

async function testMeEndpoint() {
  const baseURL = 'http://localhost:3000/api/users';
  
  console.log('🧪 Testing GET /api/users/me endpoint\n');
  
  try {
    // Test 1: Try without authentication (should fail)
    console.log('1. Testing without authentication...');
    try {
      await axios.get(`${baseURL}/me`);
      console.log('❌ Should have failed without authentication');
    } catch (error) {
      console.log('✅ Correctly rejected unauthenticated request');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message}\n`);
    }
    
    // Test 2: Try with invalid token (should fail)
    console.log('2. Testing with invalid token...');
    try {
      await axios.get(`${baseURL}/me`, {
        headers: {
          'Authorization': 'Bearer invalid.token.here'
        }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      console.log('✅ Correctly rejected invalid token');
      console.log(`   Status: ${error.response?.status}`);
      console.log(`   Message: ${error.response?.data?.message}\n`);
    }
    
    // Test 3: Login first to get a valid token
    console.log('3. Getting valid token via login...');
    
    // Try with some common test credentials
    const testCredentials = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'test@example.com', password: 'password123' },
      { email: 'user@test.com', password: 'password' }
    ];
    
    let validToken = null;
    let loginUser = null;
    
    for (const creds of testCredentials) {
      try {
        const loginResponse = await axios.post(`${baseURL}/login`, creds);
        if (loginResponse.data.success && loginResponse.data.token) {
          validToken = loginResponse.data.token;
          loginUser = loginResponse.data.user;
          console.log(`✅ Login successful with ${creds.email}`);
          console.log(`   Token: ${validToken.substring(0, 20)}...`);
          break;
        }
      } catch (loginError) {
        console.log(`   ❌ Login failed for ${creds.email}: ${loginError.response?.data?.message || loginError.message}`);
      }
    }
    
    if (validToken) {
      // Test 4: Use valid token with /me endpoint
      console.log('\n4. Testing /me endpoint with valid token...');
      
      const meResponse = await axios.get(`${baseURL}/me`, {
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });
      
      if (meResponse.data.success) {
        console.log('✅ /me endpoint successful!');
        console.log('\n📋 User Profile Response:');
        console.log(`   Success: ${meResponse.data.success}`);
        console.log(`   User ID: ${meResponse.data.user._id}`);
        console.log(`   Name: ${meResponse.data.user.fullName}`);
        console.log(`   Email: ${meResponse.data.user.email}`);
        console.log(`   Role: ${meResponse.data.user.role}`);
        console.log(`   Status: ${meResponse.data.user.status}`);
        
        if (meResponse.data.user.phoneNumber) {
          console.log(`   Phone: ${meResponse.data.user.phoneNumber}`);
        }
        
        if (meResponse.data.user.verifications) {
          console.log('\n🔒 Verification Status:');
          console.log(`   Email Verified: ${meResponse.data.user.verifications.emailVerified}`);
          console.log(`   Phone Verified: ${meResponse.data.user.verifications.phoneVerified}`);
          console.log(`   ID Verified: ${meResponse.data.user.verifications.idVerified}`);
        }
        
        if (meResponse.data.user.activity) {
          console.log('\n📊 Activity Info:');
          console.log(`   Last Login: ${meResponse.data.user.activity.lastLogin}`);
          console.log(`   Login Count: ${meResponse.data.user.activity.loginCount}`);
        }
        
        console.log(`\n   Created: ${new Date(meResponse.data.user.createdAt).toLocaleString()}`);
        
      } else {
        console.log('❌ /me endpoint failed:', meResponse.data.message);
      }
      
    } else {
      console.log('\n❌ Could not get valid token with test credentials');
      console.log('💡 To test the /me endpoint fully, create a test user first:');
      console.log('   POST /api/users/register with:');
      console.log('   {');
      console.log('     "fullName": "Test User",');
      console.log('     "email": "test@example.com",');
      console.log('     "password": "password123",');
      console.log('     "role": "guest"');
      console.log('   }');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
  
  console.log('\n✨ /me endpoint test completed!');
}

// Run the test
testMeEndpoint();
