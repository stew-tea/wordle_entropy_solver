import { normalize } from './accents';

const cache = {};

// Returns { words, wordFreq, normalizedSet }
// normalizedSet maps normalize(word) → accented word (for accent-aware lookup)
export async function loadWordList(lang, length) {
  const key = `${lang}${length}`;
  if (cache[key]) return cache[key];

  const [wordsModule, freqModule] = await Promise.all([
    import(`../data/${key}.json`),
    import(`../data/${key}_freq.json`),   // e.g. en5_freq.json (per-length, ~250 KB)
  ]);

  const words      = wordsModule.default;
  const wordFreq = freqModule.default;

  // Build a map from normalized form → accented form for validation + display
  const normalizedMap = new Map();
  for (const w of words) {
    const n = normalize(w);
    if (!normalizedMap.has(n)) normalizedMap.set(n, w);
  }

  const result = { words, wordFreq, normalizedMap };
  cache[key] = result;
  return result;
}

export function pickSecret(words) {
  // Pick from first 2000 — most common/useful words
  const pool = words.slice(0, Math.min(2000, words.length));
  return pool[Math.floor(Math.random() * pool.length)];
}
