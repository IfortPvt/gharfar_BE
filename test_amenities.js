const mongoose = require('mongoose');
const Listing = require('./src/models/Listing');

const MONGO_URI = 'mongodb+srv://gharfar:gharfar_123__@cluster0.5h1zmk9.mongodb.net/gharfar';

async function testAmenities() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to database');
    
    const listing = await Listing.findById('68835edece9bcafff248dd48');
    if (!listing) {
      console.log('Listing not found');
      return;
    }
    
    console.log('Current amenities:', JSON.stringify(listing.amenities, null, 2));
    
    // Add some test amenities
    listing.amenities = {
      included: [
        {
          key: 'wifi',
          name: 'WiFi',
          category: 'connectivity'
        },
        {
          key: 'kitchen',
          name: 'Kitchen',
          category: 'cooking'
        }
      ],
      excluded: [],
      custom: []
    };
    
    await listing.save();
    console.log('Amenities added successfully');
    
    // Test the methods
    console.log('getAllIncludedAmenities():', listing.getAllIncludedAmenities());
    console.log('getAmenityCategories():', listing.getAmenityCategories());
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testAmenities();
