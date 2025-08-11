const express = require('express');
const router = express.Router();
const listingController = require('./src/controllers/listingController');

// Simple test route
router.get('/', listingController.getAllListings);

console.log('Router created successfully');
module.exports = router;
