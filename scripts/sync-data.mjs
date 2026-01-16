/**
 * Sync data from Claude Code Folder to the website data directory.
 * Run with: npm run sync-data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIR = path.resolve(PROJECT_ROOT, '..', 'Claude Code Folder', 'feature data');
const DEST_DIR = path.resolve(PROJECT_ROOT, 'data');
const FEATURES_DEST = path.resolve(DEST_DIR, 'features');

// Ensure destination directories exist
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}
if (!fs.existsSync(FEATURES_DEST)) {
  fs.mkdirSync(FEATURES_DEST, { recursive: true });
}

let newCount = 0;
let updatedCount = 0;
let unchangedCount = 0;

// Copy Feature_output.csv
const csvSource = path.join(SOURCE_DIR, 'Feature_output.csv');
const csvDest = path.join(DEST_DIR, 'Feature_output.csv');

if (fs.existsSync(csvSource)) {
  const sourceContent = fs.readFileSync(csvSource);
  const destExists = fs.existsSync(csvDest);

  if (!destExists) {
    fs.writeFileSync(csvDest, sourceContent);
    console.log('+ Feature_output.csv (new)');
    newCount++;
  } else {
    const destContent = fs.readFileSync(csvDest);
    if (!sourceContent.equals(destContent)) {
      fs.writeFileSync(csvDest, sourceContent);
      console.log('~ Feature_output.csv (updated)');
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }
} else {
  console.error(`ERROR: Source CSV not found at ${csvSource}`);
  process.exit(1);
}

// Copy feature JSON files
const files = fs.readdirSync(SOURCE_DIR);
const jsonFiles = files.filter(f => f.startsWith('feature_') && f.endsWith('.json'));

console.log(`\nFound ${jsonFiles.length} feature JSON files to sync...`);

for (const jsonFile of jsonFiles) {
  const sourcePath = path.join(SOURCE_DIR, jsonFile);
  const destPath = path.join(FEATURES_DEST, jsonFile);

  const sourceContent = fs.readFileSync(sourcePath);
  const destExists = fs.existsSync(destPath);

  if (!destExists) {
    fs.writeFileSync(destPath, sourceContent);
    newCount++;
  } else {
    const destContent = fs.readFileSync(destPath);
    if (!sourceContent.equals(destContent)) {
      fs.writeFileSync(destPath, sourceContent);
      updatedCount++;
    } else {
      unchangedCount++;
    }
  }
}

console.log('\n--- Sync Summary ---');
console.log(`New files: ${newCount}`);
console.log(`Updated files: ${updatedCount}`);
console.log(`Unchanged: ${unchangedCount}`);
console.log(`Total: ${newCount + updatedCount + unchangedCount}`);
