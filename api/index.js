// Vercel serverless entrypoint wrapping the existing Express app
// Uses a cached MongoDB connection to avoid reconnects per invocation
const mongoose = require('mongoose');
const app = require('../src/app');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) return;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Missing MONGO_URI environment variable');
    throw new Error('MONGO_URI not set');
  }
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }
  await mongoose.connect(uri);
  isConnected = true;
}

const handler = async (req, res) => {
  try {
    await connectToDatabase();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    return res.status(500).json({ error: 'Database connection failed' });
  }
  return app(req, res);
};

module.exports = handler;
