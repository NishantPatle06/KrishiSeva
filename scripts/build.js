/**
 * KrishiSeva Production Build & Asset Integrity Validator
 * 
 * Validates frontend static assets (HTML, CSS, JS, Images)
 * and verifies syntax across all backend runtime modules.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');
let hasErrors = false;

function logPass(msg) {
  console.log(`\x1b[32m✔\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  hasErrors = true;
}

console.log('=== KrishiSeva Production Build & Asset Validation ===\n');

// 1. Validate Frontend Assets
console.log('--- 1. Validating Frontend Static Assets ---');
const requiredFrontendFiles = [
  { file: 'public/index.html', minBytes: 1000 },
  { file: 'public/style.css', minBytes: 1000 },
  { file: 'public/app.js', minBytes: 5000 },
  { file: 'public/fertilizer_bag.png', minBytes: 1000 },
  { file: 'public/farmer_field.png', minBytes: 1000 }
];

for (const { file, minBytes } of requiredFrontendFiles) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    logFail(`Missing required frontend file: ${file}`);
    continue;
  }
  const stat = fs.statSync(fullPath);
  if (stat.size < minBytes) {
    logFail(`Frontend file ${file} appears corrupted or too small (${stat.size} bytes, expected >= ${minBytes})`);
  } else {
    logPass(`${file} verified (${(stat.size / 1024).toFixed(1)} KB)`);
  }
}

// 2. Validate HTML Structure
console.log('\n--- 2. Validating HTML Document Structure ---');
const htmlPath = path.join(rootDir, 'public/index.html');
if (fs.existsSync(htmlPath)) {
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const criticalElements = [
    '<html',
    '<head>',
    '<title',
    '<meta charset="UTF-8">',
    'id="login-section"',
    'id="land-selection-section"',
    'id="supplies-selection-section"',
    'src="app.js"'
  ];

  for (const snippet of criticalElements) {
    if (!htmlContent.includes(snippet)) {
      logFail(`public/index.html missing critical element/container: ${snippet}`);
    }
  }
  if (!hasErrors) {
    logPass('public/index.html contains all critical DOM containers and scripts');
  }
}

// 3. Validate JavaScript Syntax for Frontend and Backend
console.log('\n--- 3. Validating JavaScript Syntax ---');
const jsFiles = [
  'public/app.js',
  'src/server.js',
  'src/config/db.js',
  'src/models/Farmer.js',
  'src/models/Supply.js',
  'src/models/Booking.js',
  'src/controllers/bookingController.js',
  'src/routes/api.js'
];

for (const jsFile of jsFiles) {
  const fullPath = path.join(rootDir, jsFile);
  if (!fs.existsSync(fullPath)) {
    logFail(`JavaScript file not found: ${jsFile}`);
    continue;
  }
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    new vm.Script(code, { filename: jsFile });
    logPass(`Syntax valid: ${jsFile}`);
  } catch (err) {
    logFail(`Syntax error in ${jsFile}: ${err.message}`);
  }
}

// 4. Validate Deployment Config (vercel.json)
console.log('\n--- 4. Validating Deployment Configuration ---');
const vercelConfigPath = path.join(rootDir, 'vercel.json');
if (!fs.existsSync(vercelConfigPath)) {
  logFail('vercel.json is missing');
} else {
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    if (!vercelConfig.version || !vercelConfig.routes) {
      logFail('vercel.json missing version or routes specification');
    } else {
      logPass('vercel.json is valid JSON with required routes schema');
    }
  } catch (err) {
    logFail(`vercel.json invalid JSON: ${err.message}`);
  }
}

console.log('\n======================================================');
if (hasErrors) {
  console.error('\x1b[31mProduction build and validation FAILED. See errors above.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32mProduction build and validation PASSED successfully.\x1b[0m');
  process.exit(0);
}
