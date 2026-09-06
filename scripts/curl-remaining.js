import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stillFailed = JSON.parse(fs.readFileSync(path.join(__dirname, 'still-failed.json'), 'utf8'));
const targetDir = path.join(__dirname, '..', 'server', 'public', 'assets', 'challenge-images');

function getSafeFilename(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) return parts.slice(-2).join('-');
    return parts[parts.length - 1] || 'image.png';
  } catch (e) {
    return path.basename(urlStr);
  }
}

console.log('Testing curl downloads for remaining', stillFailed.length);
const trulyMissing = [];

for (let i = 0; i < stillFailed.length; i++) {
  const url = stillFailed[i];
  const safeName = getSafeFilename(url);
  const destPath = path.join(targetDir, safeName);

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
    console.log(i + 1, 'ALREADY_EXISTS:', safeName);
    continue;
  }

  // 1. Check wayback API
  try {
    const encUrl = encodeURIComponent(url);
    const apiOut = execSync(`curl.exe -s --max-time 8 "https://archive.org/wayback/available?url=${encUrl}"`, { encoding: 'utf8' });
    const data = JSON.parse(apiOut);
    const snap = data.archived_snapshots?.closest;
    if (snap?.available && snap.url) {
      let rawUrl = snap.url.replace(/\/web\/([0-9]+)\//, '/web/$1if_/');
      if (rawUrl.startsWith('http://')) rawUrl = 'https://' + rawUrl.substring(7);
      execSync(`curl.exe -s -L --max-time 15 -o "${destPath}" "${rawUrl}"`);
      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
        console.log(i + 1, 'CURL_OK:', safeName, fs.statSync(destPath).size);
        continue;
      }
    }
  } catch (e) {}

  console.log(i + 1, 'TRULY_MISSING:', safeName);
  trulyMissing.push({ url, safeName });
}

fs.writeFileSync(path.join(__dirname, 'truly-missing.json'), JSON.stringify(trulyMissing, null, 2));
console.log('Total truly missing:', trulyMissing.length);
