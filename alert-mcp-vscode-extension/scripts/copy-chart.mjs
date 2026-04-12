import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const destDir = path.join(root, 'media');
const dest = path.join(destDir, 'chart.umd.min.js');
const fromNode = path.join(root, 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js');

const CDN =
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js';

function download(url, filePath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          const loc = res.headers.location;
          if (!loc) {
            reject(new Error('redirect without location'));
            return;
          }
          download(loc, filePath).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on('data', d => chunks.push(d));
        res.on('end', () => {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, Buffer.concat(chunks));
          resolve();
        });
      })
      .on('error', reject);
  });
}

if (fs.existsSync(fromNode)) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(fromNode, dest);
  console.log('copy-chart: copied from node_modules to', dest);
} else {
  console.log('copy-chart: node_modules/chart.js missing, downloading from CDN...');
  await download(CDN, dest);
  console.log('copy-chart: downloaded to', dest);
}
