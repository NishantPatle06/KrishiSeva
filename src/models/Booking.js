const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmer',
    required: true
  },
  supplyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supply',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  priceType: {
    type: String,
    required: true,
    enum: ['market', 'subsidized']
  },
  totalPrice: {
    type: Number,
    required: true
  },
  selectedKhasras: {
    type: [String],
    required: true
  },
  selectedDealer: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
    default: 'Pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
