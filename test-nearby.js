const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/listings/nearby?lat=40.7589&lng=-73.9851&radius=10&limit=10',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Status:', res.statusCode);
      console.log('Data count:', response.data ? response.data.length : 0);
      
      if (response.data && response.data.length > 0) {
        console.log('Sample listings:');
        response.data.forEach((listing, index) => {
          console.log(`${index + 1}. ${listing.title} - Type: ${listing.listingType}`);
        });
      } else {
        console.log('No listings found');
      }
      
      console.log('\nFull response:');
      console.log(JSON.stringify(response, null, 2));
    } catch (error) {
      console.error('Parse error:', error.message);
      console.log('Raw data:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
