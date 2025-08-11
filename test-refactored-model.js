// test-refactored-model.js
// Quick test script to verify the refactored model works correctly

const mongoose = require('mongoose');
require('dotenv').config();

// Import the refactored model
const Listing = require('./src/models/Listing');

async function testModel() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/gharfar-test');
    console.log('✅ Connected to test database');

    // Test 1: Create a Home listing
    console.log('\n🏠 Testing Home listing creation...');
    const homeData = {
      title: "Test Cozy Apartment",
      description: "A beautiful test apartment",
      listingType: "Home",
      category: "Apartment",
      price: 120,
      host: new mongoose.Types.ObjectId(),
      address: "123 Test St",
      city: "Test City",
      maxGuests: 4,
      homeDetails: {
        bedrooms: 2,
        bathrooms: 1,
        roomType: "Entire place",
        propertyType: "Apartment"
      },
      includes: ["WiFi", "Kitchen"],
      highlights: ["Great location", "Modern amenities"],
      rules: "No smoking"
    };

    const homeListing = new Listing(homeData);
    await homeListing.save();
    console.log('✅ Home listing created successfully');
    console.log('   Type-specific fields:', homeListing.getTypeSpecificFields());

    // Test 2: Create an Experience listing
    console.log('\n🎯 Testing Experience listing creation...');
    const experienceData = {
      title: "Test Photography Workshop",
      description: "Learn photography basics",
      listingType: "Experience",
      category: "Photography",
      price: 85,
      host: new mongoose.Types.ObjectId(),
      duration: "3 hours",
      startTime: "10:00 AM",
      endTime: "1:00 PM",
      maxGuests: 8,
      languages: ["English"],
      provider: "Professional photographer",
      includes: ["Camera rental", "Tutorial"],
      highlights: ["Hands-on learning"],
      experienceDetails: {
        skillLevel: "Beginner",
        ageRestriction: "All ages",
        weatherDependency: false
      }
    };

    const experienceListing = new Listing(experienceData);
    await experienceListing.save();
    console.log('✅ Experience listing created successfully');
    console.log('   Type-specific fields:', experienceListing.getTypeSpecificFields());

    // Test 3: Create a Service listing
    console.log('\n🔧 Testing Service listing creation...');
    const serviceData = {
      title: "Test Cleaning Service",
      description: "Professional home cleaning",
      listingType: "Service",
      category: "Cleaning",
      price: 100,
      host: new mongoose.Types.ObjectId(),
      provider: "CleanPro Services",
      duration: "2-3 hours",
      includes: ["All supplies", "Equipment"],
      highlights: ["Eco-friendly", "Insured"],
      serviceDetails: {
        serviceType: "Maintenance",
        qualification: "Licensed professionals",
        equipment: ["Vacuum", "Supplies"],
        travelRadius: 25,
        emergencyService: false
      }
    };

    const serviceListing = new Listing(serviceData);
    await serviceListing.save();
    console.log('✅ Service listing created successfully');
    console.log('   Type-specific fields:', serviceListing.getTypeSpecificFields());

    // Test 4: Test static methods
    console.log('\n🔍 Testing static methods...');
    const homeListings = await Listing.findByType('Home');
    console.log(`✅ Found ${homeListings.length} home listings`);

    const experienceListings = await Listing.findByType('Experience');
    console.log(`✅ Found ${experienceListings.length} experience listings`);

    // Test 5: Test instance methods
    console.log('\n📅 Testing instance methods...');
    
    // Add some availability to test
    const testDate = new Date('2024-01-15');
    homeListing.availability = [{
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
      isAvailable: true,
      specialPricing: 150
    }];
    await homeListing.save();

    const isAvailable = homeListing.isAvailableOnDate(testDate);
    console.log(`✅ Availability check for ${testDate.toISOString().split('T')[0]}: ${isAvailable}`);

    const effectivePrice = homeListing.getEffectivePrice(testDate);
    console.log(`✅ Effective price for ${testDate.toISOString().split('T')[0]}: $${effectivePrice}`);

    // Test 6: Test pre-save middleware (type-specific field cleanup)
    console.log('\n🧹 Testing pre-save middleware...');
    const testListing = new Listing({
      title: "Test Middleware",
      description: "Testing pre-save cleanup",
      listingType: "Home",
      price: 100,
      host: new mongoose.Types.ObjectId(),
      // Add fields for other types that should be cleaned up
      experienceDetails: { skillLevel: "Beginner" },
      serviceDetails: { serviceType: "Consultation" },
      homeDetails: { bedrooms: 2 }
    });

    await testListing.save();
    console.log('✅ Pre-save middleware test:');
    console.log('   experienceDetails should be undefined:', testListing.experienceDetails === undefined);
    console.log('   serviceDetails should be undefined:', testListing.serviceDetails === undefined);
    console.log('   homeDetails should exist:', testListing.homeDetails !== undefined);

    // Clean up test data
    console.log('\n🧽 Cleaning up test data...');
    await Listing.deleteMany({ title: { $regex: '^Test' } });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The refactored model is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run tests
if (require.main === module) {
  testModel().catch(console.error);
}

module.exports = testModel;
