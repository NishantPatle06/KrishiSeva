/**
 * KrishiSeva Post-Deployment Smoke Test
 * 
 * Validates deployed application health and public entrypoint.
 * Suitable for Vercel preview & production deployment validation.
 * 
 * Usage:
 *   APP_URL=https://krishi-seva-kappa.vercel.app node scripts/smoke-test.js
 *   or: node scripts/smoke-test.js http://localhost:5000
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const rawTargetUrl = process.env.APP_URL || process.env.DEPLOYMENT_URL || process.argv[2] || 'http://localhost:5000';

let parsedTarget;
try {
  parsedTarget = new URL(rawTargetUrl);
} catch {
  console.error(`\x1b[31m[SMOKE TEST ERROR] Invalid target URL provided: ${rawTargetUrl}\x1b[0m`);
  process.exit(1);
}

const BASE_URL = parsedTarget.origin;
const MAX_ATTEMPTS = parseInt(process.env.SMOKE_MAX_ATTEMPTS || '5', 10);
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || '10000', 10);
const RETRY_DELAY_MS = parseInt(process.env.SMOKE_RETRY_DELAY_MS || '3000', 10);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function fetchUrl(targetUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const req = client.get(urlObj, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'KrishiSeva-SmokeTest-Runner/1.0',
        'Accept': 'application/json, text/html'
      }
    }, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: rawData
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function verifyEndpoint(name, path, validator) {
  const fullUrl = `${BASE_URL}${path}`;
  console.log(`Checking [${name}] at ${fullUrl}...`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchUrl(fullUrl, TIMEOUT_MS);
      const isPassing = validator(response);
      if (isPassing) {
        console.log(`\x1b[32m✔ [${name}] PASSED (HTTP ${response.statusCode}) on attempt ${attempt}\x1b[0m`);
        return true;
      }
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} for [${name}] received unexpected response (HTTP ${response.statusCode}).`);
    } catch (err) {
      console.warn(`Attempt ${attempt}/${MAX_ATTEMPTS} for [${name}] failed: ${err.message}`);
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  console.error(`\x1b[31m✖ [${name}] FAILED after ${MAX_ATTEMPTS} attempts\x1b[0m`);
  return false;
}

async function runSmokeTests() {
  console.log(`\n======================================================`);
  console.log(`🚀 Starting KrishiSeva Smoke Test Suite`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms | Max Retries: ${MAX_ATTEMPTS}`);
  console.log(`======================================================\n`);

  let allPassed = true;

  // 1. Health check endpoint
  const healthPassed = await verifyEndpoint('Health Check', '/api/health', (res) => {
    if (res.statusCode !== 200) return false;
    try {
      const json = JSON.parse(res.body);
      return json.status === 'ok';
    } catch {
      return false;
    }
  });
  if (!healthPassed) allPassed = false;

  // 2. Public Homepage UI endpoint
  const uiPassed = await verifyEndpoint('Public UI Homepage', '/', (res) => {
    return res.statusCode === 200 && res.body.includes('E-Vikas System');
  });
  if (!uiPassed) allPassed = false;

  console.log(`\n======================================================`);
  if (allPassed) {
    console.log(`\x1b[32m✔ All deployment smoke tests PASSED successfully.\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m✖ Deployment smoke test checks FAILED.\x1b[0m\n`);
    process.exit(1);
  }
}

runSmokeTests();
