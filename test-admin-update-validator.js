// Test script for admin update validator
const { updateUserSchema } = require('./src/validators/adminUpdateValidator');

// Test data that should pass validation
const testData = {
  "fullName": "Admin Updated Host",
  "phoneNumber": "+1234567899",
  "bio": "Updated bio for experienced host",
  "status": "suspended",
  "adminNotes": [
    {
      "note": "Updated user profile information",
      "priority": "low"
    }
  ]
};

async function testValidator() {
  try {
    console.log('Testing admin update validator...');
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    const result = await updateUserSchema.validateAsync(testData);
    console.log('✅ Validation passed!');
    console.log('Validated data:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('❌ Validation failed:');
    console.log('Error:', error.message);
    console.log('Details:', error.details);
  }
}

testValidator();
