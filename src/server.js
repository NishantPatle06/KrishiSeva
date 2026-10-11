require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Ensure DB Connection per request (required for Vercel serverless functions)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Health endpoint redirect
app.get('/health', (req, res) => res.redirect('/api/health'));

// Routes
app.use('/api', apiRoutes);

// Fallback for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`KrishiSeva Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} in your browser`);
  });
}

module.exports = app;
