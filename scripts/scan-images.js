import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDir = path.join(__dirname, '..', 'initFiles');
const entries = fs.readdirSync(initDir, { withFileTypes: true });

const hrChallengeImages = new Set();
const hrAssetsImages = new Set();
const otherImages = new Set();
const problemImageMap = {};

for (const entry of entries) {
  if (entry.isDirectory()) {
    const p = path.join(initDir, entry.name, 'problemStatement.html');
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      const matches = content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
      for (const m of matches) {
        const url = m[1];
        if (url.includes('hr-challenge-images')) {
          hrChallengeImages.add(url);
          if (!problemImageMap[entry.name]) problemImageMap[entry.name] = [];
          problemImageMap[entry.name].push(url);
        } else if (url.includes('hr-assets')) {
          hrAssetsImages.add(url);
        } else {
          otherImages.add(url);
        }
      }
    }
  }
}

console.log('Unique hr-challenge-images:', hrChallengeImages.size);
console.log('Unique hr-assets images:', hrAssetsImages.size);
console.log('Unique other images:', otherImages.size);
console.log('Problems with hr-challenge-images:', Object.keys(problemImageMap).length);
fs.writeFileSync(path.join(__dirname, 'challenge-images.json'), JSON.stringify(Array.from(hrChallengeImages), null, 2));
