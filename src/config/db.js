const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    isConnected = mongoose.connection.readyState === 1;
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishiseva');
    isConnected = conn.connections[0].readyState === 1;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`Database Connection Error: ${error.message}`);
    }
  }
};

module.exports = connectDB;
