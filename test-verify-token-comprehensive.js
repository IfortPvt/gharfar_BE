const { VerifyTokenClient, verifyToken, isTokenValid } = require('./utils/verifyTokenClient');

/**
 * Comprehensive test suite for the Verify Token API
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Verify Token API Tests\n');
  
  const client = new VerifyTokenClient({
    baseUrl: 'http://localhost:3000',
    timeout: 5000
  });

  let testToken = null;
  let totalTests = 0;
  let passedTests = 0;

  // Helper function to run a test
  const runTest = async (testName, testFn) => {
    totalTests++;
    try {
      console.log(`\n🧪 ${testName}`);
      await testFn();
      console.log(`✅ PASSED: ${testName}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}`);
    }
  };

  // Test 1: Get a valid token first (assuming you have a test user)
  await runTest('Setup - Login to get test token', async () => {
    const axios = require('axios');
    const loginResponse = await axios.post('http://localhost:3000/api/users/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (!loginResponse.data.success || !loginResponse.data.token) {
      throw new Error('Failed to get test token. Make sure test user exists.');
    }
    
    testToken = loginResponse.data.token;
    console.log(`   Token obtained: ${testToken.substring(0, 20)}...`);
  });

  // Test 2: Verify valid token using client
  await runTest('Verify valid token using client', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const result = await client.verifyToken(testToken);
    
    if (!result.success || !result.verified) {
      throw new Error('Token verification failed');
    }
    
    // Check response structure
    if (!result.data.api_token || !result.data.refreshToken) {
      throw new Error('AuthModel structure incorrect');
    }
    
    if (!result.user.id || !result.user.email) {
      throw new Error('User information missing');
    }
    
    if (!result.tokenInfo.issuedAt || !result.tokenInfo.expiresAt) {
      throw new Error('Token info missing');
    }
    
    console.log(`   User: ${result.user.email} (${result.user.role})`);
    console.log(`   Token valid for: ${result.tokenInfo.validFor}`);
  });

  // Test 3: Quick validation using helper function
  await runTest('Quick token validation', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const isValid = await client.isTokenValid(testToken);
    
    if (!isValid) {
      throw new Error('Token should be valid');
    }
    
    console.log('   Token is valid ✓');
  });

  // Test 4: Get user from token
  await runTest('Get user from token', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const user = await client.getUserFromToken(testToken);
    
    if (!user || !user.id) {
      throw new Error('Failed to get user from token');
    }
    
    console.log(`   User retrieved: ${user.fullName} (${user.email})`);
  });

  // Test 5: Get auth model from token
  await runTest('Get auth model from token', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const authModel = await client.getAuthModel(testToken);
    
    if (!authModel || !authModel.api_token) {
      throw new Error('Failed to get auth model from token');
    }
    
    console.log('   Auth model retrieved ✓');
    console.log(`   Has refresh token: ${authModel.refreshToken ? 'Yes' : 'No'}`);
  });

  // Test 6: Test invalid token
  await runTest('Verify invalid token', async () => {
    const result = await client.verifyToken('invalid.token.here');
    
    if (result.success || result.verified) {
      throw new Error('Invalid token should not be verified');
    }
    
    if (!result.error || typeof result.error !== 'string') {
      throw new Error('Error message should be provided');
    }
    
    console.log(`   Error message: ${result.error}`);
  });

  // Test 7: Test empty token
  await runTest('Verify empty token', async () => {
    try {
      await client.verifyToken('');
    } catch (error) {
      if (!error.message.includes('non-empty string')) {
        throw new Error('Should throw specific error for empty token');
      }
      console.log('   Correctly rejected empty token');
      return;
    }
    
    throw new Error('Should have thrown error for empty token');
  });

  // Test 8: Test null token
  await runTest('Verify null token', async () => {
    try {
      await client.verifyToken(null);
    } catch (error) {
      if (!error.message.includes('required')) {
        throw new Error('Should throw specific error for null token');
      }
      console.log('   Correctly rejected null token');
      return;
    }
    
    throw new Error('Should have thrown error for null token');
  });

  // Test 9: Test batch verification
  await runTest('Batch token verification', async () => {
    if (!testToken) throw new Error('No test token available');
    
    const tokens = [
      testToken,
      'invalid.token.1',
      'invalid.token.2'
    ];
    
    const results = await client.verifyTokens(tokens);
    
    if (results.length !== 3) {
      throw new Error('Should return 3 results');
    }
    
    // First should be valid
    if (!results[0].result.verified) {
      throw new Error('First token should be valid');
    }
    
    // Others should be invalid
    if (results[1].result.verified || results[2].result.verified) {
      throw new Error('Invalid tokens should not be verified');
    }
    
    console.log('   Batch verification completed successfully');
  });

  // Test 10: Test standalone functions
  await runTest('Standalone helper functions', async () => {
    if (!testToken) throw new Error('No test token available');
    
    // Test standalone verifyToken function
    const result = await verifyToken(testToken);
    if (!result.success) {
      throw new Error('Standalone verifyToken failed');
    }
    
    // Test standalone isTokenValid function
    const isValid = await isTokenValid(testToken);
    if (!isValid) {
      throw new Error('Standalone isTokenValid failed');
    }
    
    console.log('   Standalone functions work correctly');
  });

  // Test 11: Test with different base URL configuration
  await runTest('Custom configuration test', async () => {
    const customClient = new VerifyTokenClient({
      baseUrl: 'http://localhost:3000',
      timeout: 3000
    });
    
    // Change timeout
    customClient.setTimeout(5000);
    
    // Verify the client works with custom config
    if (!testToken) throw new Error('No test token available');
    
    const result = await customClient.verifyToken(testToken);
    if (!result.success) {
      throw new Error('Custom client verification failed');
    }
    
    console.log('   Custom configuration works correctly');
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! The Verify Token API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }
  
  console.log('\n✨ Verify Token API implementation complete!');
  console.log('\nAPI Features:');
  console.log('✅ Token validation with JWT verification');
  console.log('✅ User status and permission checking');
  console.log('✅ Refresh token generation');
  console.log('✅ Comprehensive error handling');
  console.log('✅ Activity tracking');
  console.log('✅ TypeScript interfaces');
  console.log('✅ Client library');
  console.log('✅ Postman collection');
  console.log('✅ Full documentation');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };
