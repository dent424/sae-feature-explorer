/**
 * Data loading utilities for SAE Feature Explorer
 */

import fs from 'fs';
import path from 'path';

// Feature index entry from CSV
export interface FeatureIndexEntry {
  feature_index: number;
  rank_control: number;
  rank_nocontrol: number;
  interpretation: string;
  verify_status?: string;
  paralinguistic?: string;
  hasData: boolean;
}

// Feature JSON data structure
export interface FeatureData {
  feature_idx: number;
  stats: {
    activation_rate: number;
    mean_when_active: number;
    max_activation: number;
    std_when_active: number;
  };
  top_tokens: {
    top_tokens: Array<{
      token: string;
      count: number;
      mean_activation: number;
    }>;
  };
  top_activations: {
    activations: Array<{
      context: string;
      active_token: string;
      activation: number;
    }>;
  };
  ngram_analysis: {
    ngrams: {
      '2grams': Array<{ ngram_str: string; count: number; percent: number }>;
      '3grams': Array<{ ngram_str: string; count: number; percent: number }>;
      '4grams': Array<{ ngram_str: string; count: number; percent: number }>;
    };
  };
  coactivation: {
    coactivated_features: Array<{
      feature_idx: number;
      count: number;
      percent: number;
    }>;
  };
  position_distribution: {
    bins: Array<{
      range: string;
      label: string;
      count: number;
      percent: number;
    }>;
  };
}

// Load features index
export function loadFeaturesIndex(): FeatureIndexEntry[] {
  const indexPath = path.join(process.cwd(), 'src', 'lib', 'features-index.json');
  if (!fs.existsSync(indexPath)) {
    console.warn('features-index.json not found. Run npm run build:data');
    return [];
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

// Load feature IDs that have data
export function loadFeaturesWithData(): number[] {
  const dataPath = path.join(process.cwd(), 'src', 'lib', 'features-with-data.json');
  if (!fs.existsSync(dataPath)) {
    console.warn('features-with-data.json not found. Run npm run build:data');
    return [];
  }
  return JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
}

// Load full feature data from JSON
export function loadFeatureData(featureId: number): FeatureData | null {
  const jsonPath = path.join(process.cwd(), 'data', 'features', `feature_${featureId}.json`);
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

// Get feature by ID from index
export function getFeatureFromIndex(featureId: number): FeatureIndexEntry | null {
  const features = loadFeaturesIndex();
  return features.find(f => f.feature_index === featureId) || null;
}

// Paginate features
export function paginateFeatures(
  features: FeatureIndexEntry[],
  page: number,
  perPage: number = 100
): {
  data: FeatureIndexEntry[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(features.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return {
    data: features.slice(start, end),
    totalPages,
    currentPage: page,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// Sort options
export type SortOption = 'rank-ctrl' | 'rank-ctrl-desc' | 'rank-noctrl' | 'rank-noctrl-desc' | 'id' | 'id-desc' | 'has-data';

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'rank-ctrl', label: 'Rank Control (Best)' },
  { value: 'rank-ctrl-desc', label: 'Rank Control (Worst)' },
  { value: 'rank-noctrl', label: 'Rank No-Control (Best)' },
  { value: 'rank-noctrl-desc', label: 'Rank No-Control (Worst)' },
  { value: 'id', label: 'Feature ID (Ascending)' },
  { value: 'id-desc', label: 'Feature ID (Descending)' },
  { value: 'has-data', label: 'Has Analysis Data' },
];

// Sort features by given option
export function sortFeatures(features: FeatureIndexEntry[], sort: SortOption): FeatureIndexEntry[] {
  const sorted = [...features];
  switch (sort) {
    case 'rank-ctrl':
      return sorted.sort((a, b) => a.rank_control - b.rank_control);
    case 'rank-ctrl-desc':
      return sorted.sort((a, b) => b.rank_control - a.rank_control);
    case 'rank-noctrl':
      return sorted.sort((a, b) => a.rank_nocontrol - b.rank_nocontrol);
    case 'rank-noctrl-desc':
      return sorted.sort((a, b) => b.rank_nocontrol - a.rank_nocontrol);
    case 'id':
      return sorted.sort((a, b) => a.feature_index - b.feature_index);
    case 'id-desc':
      return sorted.sort((a, b) => b.feature_index - a.feature_index);
    case 'has-data':
      return sorted.sort((a, b) => {
        if (a.hasData === b.hasData) return a.rank_control - b.rank_control;
        return a.hasData ? -1 : 1;
      });
    default:
      return sorted;
  }
}

// Get sort label
export function getSortLabel(sort: SortOption): string {
  return SORT_OPTIONS.find(o => o.value === sort)?.label || 'Rank Control (Best)';
}

// Search features by interpretation text
export function searchFeatures(features: FeatureIndexEntry[], query: string): FeatureIndexEntry[] {
  if (!query.trim()) return features;
  const lowerQuery = query.toLowerCase();
  return features.filter(f =>
    f.interpretation.toLowerCase().includes(lowerQuery)
  );
}

// Format token for display (handle special characters)
// GPT-2 uses byte-level BPE where certain bytes map to Unicode characters:
// - Ċ (U+010A) = newline \n
// - Ġ (U+0120) = space (leading space in tokens)
// - ĉ (U+0109) = tab \t
// - č (U+010D) = carriage return \r
export function formatToken(token: string): { display: string; isSpecial: boolean } {
  // Handle pure special characters
  if (token === '\n' || token === 'Ċ') return { display: '[NEWLINE]', isSpecial: true };
  if (token === ' ') return { display: '[SPACE]', isSpecial: true };
  if (token === '\t' || token === 'ĉ') return { display: '[TAB]', isSpecial: true };
  if (token === '\r' || token === 'č') return { display: '[CR]', isSpecial: true };
  if (token === '') return { display: '[EMPTY]', isSpecial: true };

  // Handle GPT-2 BPE leading space character (Ġ)
  if (token.startsWith('Ġ') && token.length > 1) {
    return { display: `[SP]${token.slice(1)}`, isSpecial: false };
  }
  // Handle regular leading space tokens
  if (token.startsWith(' ') && token.length > 1) {
    return { display: `[SP]${token.slice(1)}`, isSpecial: false };
  }

  // Handle tokens that are purely the space marker
  if (token === 'Ġ') return { display: '[SPACE]', isSpecial: true };

  return { display: token, isSpecial: false };
}

// Parse context string with highlight markers
export function parseContext(context: string): { before: string; token: string; after: string } {
  // Context format: "...text**highlighted**more text..."
  const match = context.match(/^(.*)\*\*(.*?)\*\*(.*)$/);
  if (match) {
    return {
      before: match[1],
      token: match[2],
      after: match[3],
    };
  }
  return { before: context, token: '', after: '' };
}
