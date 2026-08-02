const mongoose = require('mongoose');

const SupplySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['seeds', 'fertilizers']
  },
  marketPrice: {
    type: Number,
    required: true
  },
  subsidizedPrice: {
    type: Number,
    required: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Supply', SupplySchema);
