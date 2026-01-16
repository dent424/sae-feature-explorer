/**
 * Build features index from CSV data.
 * Run with: npm run build:data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'data');
const SRC_LIB = path.resolve(PROJECT_ROOT, 'src', 'lib');
const FEATURES_DIR = path.resolve(DATA_DIR, 'features');

// Ensure lib directory exists
if (!fs.existsSync(SRC_LIB)) {
  fs.mkdirSync(SRC_LIB, { recursive: true });
}

// Read and parse CSV
const csvPath = path.join(DATA_DIR, 'Feature_output.csv');
if (!fs.existsSync(csvPath)) {
  console.error('ERROR: Feature_output.csv not found. Run npm run sync-data first.');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.trim());

console.log('CSV Headers:', headers);

// Parse each row into an object
const features = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  // Handle CSV with potential commas in quoted fields
  const values = parseCSVLine(line);

  if (values.length < headers.length) continue;

  const feature = {};
  headers.forEach((header, idx) => {
    feature[header] = values[idx];
  });

  // Convert numeric fields
  feature.feature_index = parseInt(feature.feature_index) || 0;
  feature.rank_control = parseFloat(feature.rank_control) || 0;
  feature.rank_nocontrol = parseFloat(feature.rank_nocontrol) || 0;

  // Check if JSON data exists for this feature
  const jsonPath = path.join(FEATURES_DIR, `feature_${feature.feature_index}.json`);
  feature.hasData = fs.existsSync(jsonPath);

  features.push(feature);
}

// Sort by rank_control (ascending = lower rank is more interesting)
features.sort((a, b) => a.rank_control - b.rank_control);

// Count features with data
const withData = features.filter(f => f.hasData).length;
console.log(`\nProcessed ${features.length} features`);
console.log(`Features with JSON data: ${withData}`);

// Write index
const indexPath = path.join(SRC_LIB, 'features-index.json');
fs.writeFileSync(indexPath, JSON.stringify(features, null, 2));
console.log(`\nWrote ${indexPath}`);

// Also write a smaller version with just IDs that have data
const featuresWithData = features.filter(f => f.hasData);
const dataIndexPath = path.join(SRC_LIB, 'features-with-data.json');
fs.writeFileSync(dataIndexPath, JSON.stringify(featuresWithData.map(f => f.feature_index)));
console.log(`Wrote ${dataIndexPath} (${featuresWithData.length} IDs)`);

// Helper to parse CSV line handling quoted fields
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}
