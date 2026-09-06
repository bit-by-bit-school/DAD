import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const initDir = path.join(__dirname, '..', 'initFiles');
const entries = fs.readdirSync(initDir, { withFileTypes: true });

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

let updatedFiles = 0;
let updatedImages = 0;

for (const entry of entries) {
  if (entry.isDirectory()) {
    const p = path.join(initDir, entry.name, 'problemStatement.html');
    if (fs.existsSync(p)) {
      let content = fs.readFileSync(p, 'utf8');
      const regex = /https?:\/\/(?:s3\.amazonaws\.com\/hr-challenge-images|hr-challenge-images\.s3\.amazonaws\.com)\/([^"'\s>]+)/g;
      let fileChanged = false;

      const newContent = content.replace(regex, (match) => {
        const safeName = getSafeFilename(match);
        fileChanged = true;
        updatedImages++;
        return `/assets/challenge-images/${safeName}`;
      });

      if (fileChanged) {
        fs.writeFileSync(p, newContent, 'utf8');
        updatedFiles++;
      }
    }
  }
}

console.log(`Updated ${updatedImages} image references across ${updatedFiles} problem statements.`);
