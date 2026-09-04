/**
 * Automated Verification Script for HackerRank Solutions Extension (ESM)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT_DIR = path.join(__dirname, '..', 'extension');

console.log('--- 1. Checking Manifest V3 File ---');
const manifestPath = path.join(EXT_DIR, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json missing');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
assert(manifest.permissions.includes('storage'), 'Missing storage permission');
assert(manifest.permissions.includes('unlimitedStorage'), 'Missing unlimitedStorage permission');
assert(manifest.host_permissions.includes('https://*.hackerrank.com/*'), 'Missing HackerRank host permission');
console.log('✔ manifest.json is valid Manifest V3');

console.log('\n--- 2. Checking Icon Assets ---');
for (const size of ['16', '48', '128']) {
  const iconPath = path.join(EXT_DIR, 'icons', `icon-${size}.png`);
  assert(fs.existsSync(iconPath), `icon-${size}.png missing`);
  const buf = fs.readFileSync(iconPath);
  assert(buf.length > 50, `icon-${size}.png too small`);
  assert.strictEqual(buf.toString('hex', 0, 4), '89504e47', `icon-${size}.png invalid PNG header`);
  console.log(`✔ icon-${size}.png verified (${buf.length} bytes)`);
}

console.log('\n--- 3. Checking Seed Data & Storage Module ---');
globalThis.self = globalThis;

// Load seed data into global scope
const seedDataCode = fs.readFileSync(path.join(EXT_DIR, 'data', 'seed-data.js'), 'utf8');
new Function(seedDataCode)();

const problemsListCode = fs.readFileSync(path.join(EXT_DIR, 'data', 'problems-list.js'), 'utf8');
new Function(problemsListCode)();

const storageCode = fs.readFileSync(path.join(EXT_DIR, 'lib', 'storage.js'), 'utf8');
new Function(storageCode)();

const apiCode = fs.readFileSync(path.join(EXT_DIR, 'lib', 'api.js'), 'utf8');
new Function(apiCode)();

const HRStorage = globalThis.HRStorage;
const HRAPI = globalThis.HRAPI;

assert(globalThis.HR_SEED_DATA, 'HR_SEED_DATA is defined');
assert(Array.isArray(globalThis.HR_PROBLEM_SLUGS), 'HR_PROBLEM_SLUGS is array');
console.log(`✔ Seed contains ${Object.keys(globalThis.HR_SEED_DATA.problems).length} problems and ${globalThis.HR_PROBLEM_SLUGS.length} slug index`);

// Mock localStorage for storage testing
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; }
};

(async () => {
  await HRStorage.init();
  const problems = await HRStorage.getProblems();
  const solutions = await HRStorage.getSolutions();
  const users = await HRStorage.getUsers();

  console.log(`✔ HRStorage initialized: ${Object.keys(problems).length} problems, ${users.length} users`);
  assert.strictEqual(users.length, 6, 'Expected 6 initial users');

  console.log('\n--- 4. Testing Upsert / Merge Logic ---');
  const testUser = 'test_dev_99';
  const saveResult = await HRStorage.saveUserSolutions(testUser, {
    'solve-me-first': {
      code: 'def solveMeFirst(a,b):\n    return a+b\n',
      language: 'python'
    },
    'simple-array-sum': {
      code: 'def simpleArraySum(ar):\n    return sum(ar)\n',
      language: 'python'
    }
  });

  console.log(`✔ Upsert result:`, saveResult);
  assert.strictEqual(saveResult.newlyAddedCount, 2);

  const updatedUsers = await HRStorage.getUsers();
  const foundUser = updatedUsers.find(u => u.username === testUser);
  assert(foundUser, 'New user was registered in users list');
  assert.strictEqual(foundUser.solvedCount, 2, 'User solved count updated');

  const smfSolutions = await HRStorage.getSolutionsForProblem('solve-me-first');
  assert(smfSolutions[testUser], 'Problem has testUser solution');
  console.log(`✔ Problem solve-me-first now has ${Object.keys(smfSolutions).length} user solutions`);

  console.log('\n--- 6. Testing Export / Backup ---');
  const exported = await HRStorage.exportData();
  assert(exported.users && exported.problems && exported.solutions, 'Export data structure valid');
  console.log(`✔ Export data payload verified (${JSON.stringify(exported).length} characters)`);

  console.log('\n--- 7. Testing Prod Server Settings & Sync Module ---');
  const syncCode = fs.readFileSync(path.join(EXT_DIR, 'lib', 'sync.js'), 'utf8');
  new Function(syncCode)();
  const HRSync = globalThis.HRSync;
  assert(HRSync && typeof HRSync.pushToServer === 'function', 'HRSync module initialized');

  await HRStorage.saveSettings({ serverUrl: 'https://prod-hackerrank.example.com', authToken: 'test_prod_token' });
  const savedSettings = await HRStorage.getSettings();
  assert.strictEqual(savedSettings.serverUrl, 'https://prod-hackerrank.example.com');
  assert.strictEqual(savedSettings.authToken, 'test_prod_token');
  console.log('✔ Prod Server URL and Auth Token successfully configured in settings');

  console.log('\n🎉 ALL EXTENSION MODULES AND ASSETS VERIFIED SUCCESSFULLY!');
})();
