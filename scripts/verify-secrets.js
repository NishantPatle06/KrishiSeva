/**
 * KrishiSeva Secret & Credential Leakage Detector
 * 
 * Verifies that no sensitive tokens, database passwords,
 * or private keys have been committed into repository sources.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
let leakDetected = false;

console.log('=== KrishiSeva Secret Scanning & Credential Safety ===\n');

// 1. Verify .env is not committed
try {
  const trackedFiles = execSync('git ls-files .env .env.*', { cwd: rootDir, encoding: 'utf8' }).trim();
  if (trackedFiles) {
    console.error(`\x1b[31m✖ Git tracks environment files:\n${trackedFiles}\x1b[0m`);
    leakDetected = true;
  } else {
    console.log('\x1b[32m✔ .env files are properly excluded from Git tracking.\x1b[0m');
  }
} catch {
  // If git command fails or not tracked, verify .gitignore
  const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
  if (!gitignore.includes('.env')) {
    console.error('\x1b[31m✖ .gitignore does not specify .env\x1b[0m');
    leakDetected = true;
  } else {
    console.log('\x1b[32m✔ .gitignore contains .env entry.\x1b[0m');
  }
}

// 2. Scan source files for potential secrets
const suspiciousPatterns = [
  { name: 'Live Twilio Token', regex: /AC[a-f0-9]{32}/i, ignore: ['ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'] },
  { name: 'Hardcoded MongoDB Atlas URI with password', regex: /mongodb\+srv:\/\/[^:]+:[^@]+@/i },
  { name: 'Private Key block', regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/ },
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/ }
];

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'coverage', '.vercel'].includes(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      if (['package-lock.json', 'fertilizer_bag.png', 'farmer_field.png'].includes(entry.name)) continue;
      if (entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.ico')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of suspiciousPatterns) {
        if (pattern.regex.test(content)) {
          const match = content.match(pattern.regex)[0];
          if (pattern.ignore && pattern.ignore.includes(match)) {
            continue; // Known mock placeholder
          }
          console.error(`\x1b[31m✖ Suspicious pattern detected (${pattern.name}) in ${relPath}\x1b[0m`);
          leakDetected = true;
        }
      }
    }
  }
}

scanDirectory(path.join(rootDir, 'src'));
scanDirectory(path.join(rootDir, 'public'));
scanDirectory(path.join(rootDir, 'scripts'));

console.log('\n======================================================');
if (leakDetected) {
  console.error('\x1b[31mSecret scanning FAILED: Potential secrets detected.\x1b[0m');
  process.exit(1);
} else {
  console.log('\x1b[32m✔ Secret scanning PASSED: No secrets found in codebase.\x1b[0m');
  process.exit(0);
}
