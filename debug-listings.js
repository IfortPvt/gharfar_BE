require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('./src/models/Listing');

async function checkListings() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    const allListings = await Listing.find({});
    console.log(`\nTotal listings in database: ${allListings.length}`);
    
    console.log('\n=== LISTING STATUS ANALYSIS ===');
    allListings.forEach((listing, index) => {
      console.log(`\nListing ${index + 1}:`);
      console.log(`  Title: ${listing.title}`);
      console.log(`  Status field: ${listing.status || 'UNDEFINED'}`);
      console.log(`  VerificationStatus: ${listing.verificationStatus}`);
      console.log(`  ID: ${listing._id}`);
    });

    // Check what the admin service query returns
    console.log('\n=== ADMIN SERVICE QUERY TEST ===');
    const activeListings = await Listing.countDocuments({ status: 'active' });
    console.log(`Listings with status: 'active': ${activeListings}`);
    
    const verifiedListings = await Listing.countDocuments({ verificationStatus: 'Verified' });
    console.log(`Listings with verificationStatus: 'Verified': ${verifiedListings}`);
    
    const pendingListings = await Listing.countDocuments({ verificationStatus: 'Pending' });
    console.log(`Listings with verificationStatus: 'Pending': ${pendingListings}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkListings();
