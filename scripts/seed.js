require('dotenv').config();
const mongoose = require('mongoose');
const Farmer = require('../src/models/Farmer');
const Supply = require('../src/models/Supply');
const Booking = require('../src/models/Booking');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishiseva');
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Farmer.deleteMany({});
    await Supply.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data.');

    // Seed Farmers
    await Farmer.create([
      {
        name: 'Rajesh Kumar (Small Farmer)',
        fatherName: 'Late Ram Swaroop Kumar',
        phone: '9876543210',
        aadhaar: '123456789012',
        dob: '15/08/1980',
        address: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP, 462001',
        landParcels: [
          { khasraNo: '102/1', sizeAcres: 2.0, location: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP' },
          { khasraNo: '105/3', sizeAcres: 1.5, location: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP' },
          { khasraNo: '108/4', sizeAcres: 0.8, location: 'Village: Gopalpur, Tehsil: Huzur, District: Bhopal, MP' },
          { khasraNo: '112/1', sizeAcres: 1.2, location: 'Village: Pipaliya, Tehsil: Kolar, District: Bhopal, MP' },
          { khasraNo: '115/2', sizeAcres: 2.5, location: 'Village: Bilkhiriya, Tehsil: Huzur, District: Bhopal, MP' },
          { khasraNo: '118/1/A', sizeAcres: 1.0, location: 'Village: Barkheda, Tehsil: Kolar, District: Bhopal, MP' }
        ]
      },
      {
        name: 'Savitri Devi (Medium Farmer)',
        fatherName: 'Late Harishankar Prasad',
        phone: '9876543211',
        aadhaar: '987654321098',
        dob: '03/05/1975',
        address: 'Village: Pipariya, Tehsil: Sohagpur, District: Narmadapuram, MP, 461775',
        landParcels: [
          { khasraNo: '201/2', sizeAcres: 4.5, location: 'Village: Pipariya, Tehsil: Sohagpur, District: Narmadapuram, MP' },
          { khasraNo: '204/1', sizeAcres: 2.0, location: 'Village: Pipariya, Tehsil: Sohagpur, District: Narmadapuram, MP' },
          { khasraNo: '208/3/B', sizeAcres: 1.8, location: 'Village: Sobhapur, Tehsil: Sohagpur, District: Narmadapuram, MP' }
        ]
      },
      {
        name: 'Nishant Patle (Farmer)',
        fatherName: 'Late Suresh Patle',
        phone: '6266155054',
        aadhaar: '456789012345',
        dob: '12/10/1992',
        address: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP, 462001',
        landParcels: [
          { khasraNo: '305/1', sizeAcres: 3.2, location: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP' },
          { khasraNo: '308/2', sizeAcres: 2.1, location: 'Village: Rampur, Tehsil: Huzur, District: Bhopal, MP' }
        ]
      }
    ]);
    console.log('Seeded Farmers.');

    // Seed Supplies
    await Supply.create([
      {
        name: 'Certified Wheat Seeds (HD-2967)',
        category: 'seeds',
        marketPrice: 1200,
        subsidizedPrice: 300,
        stock: 500
      },
      {
        name: 'Paddy Seeds (IR-64)',
        category: 'seeds',
        marketPrice: 1400,
        subsidizedPrice: 350,
        stock: 1000
      },
      {
        name: 'Hybrid Maize Seeds',
        category: 'seeds',
        marketPrice: 1600,
        subsidizedPrice: 400,
        stock: 800
      },
      {
        name: 'Government Neem-Coated Urea (Soda)',
        category: 'fertilizers',
        marketPrice: 800,
        subsidizedPrice: 240,
        stock: 5000
      },
      {
        name: 'Di-Ammonium Phosphate (DAP)',
        category: 'fertilizers',
        marketPrice: 1500,
        subsidizedPrice: 450,
        stock: 4000
      },
      {
        name: 'Muriate of Potash (MOP)',
        category: 'fertilizers',
        marketPrice: 1100,
        subsidizedPrice: 330,
        stock: 3000
      },
      {
        name: 'Single Super Phosphate (SSP)',
        category: 'fertilizers',
        marketPrice: 900,
        subsidizedPrice: 270,
        stock: 2000
      },
      {
        name: 'Granular NPK Complex',
        category: 'fertilizers',
        marketPrice: 1300,
        subsidizedPrice: 390,
        stock: 2500
      }
    ]);
    console.log('Seeded Supplies.');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
