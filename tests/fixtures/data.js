const Farmer = require('../../src/models/Farmer');
const Supply = require('../../src/models/Supply');

async function seedTestFarmer(customOverrides = {}) {
  return await Farmer.create({
    name: 'Ramesh Patel',
    fatherName: 'Late Suresh Patel',
    phone: '9876543210',
    aadhaar: '123456789012',
    dob: '15/08/1980',
    address: 'Village Rampur, Bhopal, MP',
    landParcels: [
      { khasraNo: '101/1', sizeAcres: 2.0, location: 'Village Rampur' },
      { khasraNo: '102/2', sizeAcres: 1.5, location: 'Village Rampur' }
    ],
    ...customOverrides
  });
}

async function seedTestSupply(customOverrides = {}) {
  return await Supply.create({
    name: 'Certified Wheat Seeds (HD-2967)',
    category: 'seeds',
    marketPrice: 1200,
    subsidizedPrice: 300,
    stock: 50,
    ...customOverrides
  });
}

async function seedFertilizerSupply(customOverrides = {}) {
  return await Supply.create({
    name: 'Neem-Coated Urea',
    category: 'fertilizers',
    marketPrice: 800,
    subsidizedPrice: 240,
    stock: 100,
    ...customOverrides
  });
}

module.exports = {
  seedTestFarmer,
  seedTestSupply,
  seedFertilizerSupply
};
