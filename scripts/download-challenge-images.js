import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, '..', 'server', 'public', 'assets', 'challenge-images');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const challengeImagesFile = path.join(__dirname, 'challenge-images.json');
let urls = [];
if (fs.existsSync(challengeImagesFile)) {
  urls = JSON.parse(fs.readFileSync(challengeImagesFile, 'utf8'));
}

console.log(`Starting download for ${urls.length} challenge images...`);

function getSafeFilename(urlStr) {
  try {
    const u = new URL(urlStr);
    const parts = u.pathname.split('/').filter(Boolean);
    // e.g. hr-challenge-images/19825/1459017588-a9b7aa42b4-chess1.png -> 19825-1459017588-a9b7aa42b4-chess1.png
    if (parts.length >= 2) {
      return parts.slice(-2).join('-');
    }
    return parts[parts.length - 1] || 'image.png';
  } catch (e) {
    return path.basename(urlStr);
  }
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function downloadImage(url) {
  const safeName = getSafeFilename(url);
  const destPath = path.join(targetDir, safeName);

  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 500) {
    return { url, safeName, status: 'EXISTS', size: fs.statSync(destPath).size };
  }

  // 1. Try direct URL first (just in case)
  try {
    const res = await fetchWithTimeout(url, 4000);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 200) {
        fs.writeFileSync(destPath, buf);
        return { url, safeName, status: 'DIRECT_OK', size: buf.length };
      }
    }
  } catch (e) {}

  // 2. Try Wayback Machine API
  try {
    const wbApi = 'https://archive.org/wayback/available?url=' + encodeURIComponent(url);
    const apiRes = await fetchWithTimeout(wbApi, 8000);
    if (apiRes.ok) {
      const data = await apiRes.json();
      const snapshot = data.archived_snapshots?.closest;
      if (snapshot && snapshot.available && snapshot.url) {
        // Use if_ prefix for raw original asset without archive.org banner
        let rawUrl = snapshot.url;
        if (rawUrl.includes('/web/')) {
          rawUrl = rawUrl.replace(/\/web\/([0-9]+)\//, '/web/$1if_/');
        }
        const imgRes = await fetchWithTimeout(rawUrl, 15000);
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length > 200) {
            fs.writeFileSync(destPath, buf);
            return { url, safeName, status: 'WAYBACK_OK', size: buf.length };
          }
        }
      }
    }
  } catch (e) {
    // console.log(`Wayback error for ${url}:`, e.message);
  }

  return { url, safeName, status: 'FAILED' };
}

// Run in concurrency pool of 6
async function processAll() {
  const results = [];
  const failed = [];
  const concurrency = 6;
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const curIdx = idx++;
      const url = urls[curIdx];
      const res = await downloadImage(url);
      results.push(res);
      console.log(`[${results.length}/${urls.length}] ${res.status}: ${res.safeName}`);
      if (res.status === 'FAILED') {
        failed.push(url);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log('--- Download Complete ---');
  console.log(`Total: ${urls.length}`);
  console.log(`Success: ${results.filter(r => r.status !== 'FAILED').length}`);
  console.log(`Failed/Unavailable on Wayback: ${failed.length}`);

  fs.writeFileSync(path.join(__dirname, 'download-results.json'), JSON.stringify({ results, failed }, null, 2));
}

processAll();
