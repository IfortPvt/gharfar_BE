// Express app setup
const express = require('express');
const app = express();

// Middleware
app.use(express.json());
const cors = require('cors');
app.use(cors({
  origin: '*', // Allow all origins for development; adjust for production
  credentials: true
}));

// Import and use routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const listingRoutes = require('./routes/listingRoutes');
const amenityRoutes = require('./routes/amenityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const hostRoutes = require('./routes/hostRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/host', hostRoutes);
app.use('/api', calendarRoutes);

// Simple test route
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server is working' });
});

// Health check route
app.get('/health', (req, res) => res.send('OK'));

// 404 handler for undefined routes - ensure JSON response
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Cannot ${req.method} ${req.originalUrl}`,
    details: [{
      field: 'route',
      message: 'The requested endpoint does not exist',
      value: req.originalUrl
    }]
  });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

module.exports = app;
