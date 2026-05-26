// server/src/config/mongodb.js
// MongoDB connection configuration using Mongoose

const mongoose = require('mongoose');

let isConnected = false;

const connectMongoDB = async () => {
  if (isConnected) {
    console.log('✓ MongoDB already connected');
    return;
  }

  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stylesynk';
    
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    isConnected = true;
    console.log('✓ MongoDB connected:', uri.split('@')[1] || 'localhost');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
      isConnected = true;
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isConnected = false;
    // Don't exit process - allow app to run with PostgreSQL only
  }
};

const disconnectMongoDB = async () => {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('✓ MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting MongoDB:', error);
  }
};

module.exports = { 
  connectMongoDB, 
  disconnectMongoDB,
  mongoose,
  isConnected: () => isConnected
};

// Made with Bob
