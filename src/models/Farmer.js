const mongoose = require('mongoose');

const LandParcelSchema = new mongoose.Schema({
  khasraNo: { type: String, required: true },
  sizeAcres: { type: Number, required: true },
  location: { type: String, required: true }
});

const FarmerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  fatherName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  aadhaar: {
    type: String,
    required: true,
    unique: true
  },
  dob: {
    type: String,
    default: '15/08/1980'
  },
  address: {
    type: String,
    default: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, State: Madhya Pradesh'
  },
  landParcels: [LandParcelSchema],
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('Farmer', FarmerSchema);
