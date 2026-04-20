import { normalize } from './accents';

const cache = {};

// difficulty: 'easy' | 'medium' | 'hard'
// Easy = top 40%, Medium = top 70%, Hard = full list
const DIFFICULTY_CUTOFF = { easy: 0.4, medium: 0.7, hard: 1.0 };

// Returns { words, wordFreq, normalizedMap }
// words are sorted by descending frequency and sliced by difficulty.
// normalizedMap is built from the full (unsliced) list so any valid word can be typed.
export async function loadWordList(lang, length, difficulty = 'hard') {
  const baseKey = `${lang}${length}`;
  const key     = `${baseKey}_${difficulty}`;
  if (cache[key]) return cache[key];

  // Load the freq file — it IS the word list: { word: frequency }
  const freqModule = await import(`../data/${baseKey}_freq.json`);
  const wordFreq   = freqModule.default;

  // Sort all words by frequency descending
  const allSorted = Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]);

  // Build normalizedMap from the full list so the player can type any valid word
  const normalizedMap = new Map();
  for (const w of allSorted) {
    const n = normalize(w);
    if (!normalizedMap.has(n)) normalizedMap.set(n, w);
  }

  // Slice by difficulty for the game pool
  const cutoff = DIFFICULTY_CUTOFF[difficulty] ?? 1.0;
  const words  = allSorted.slice(0, Math.ceil(allSorted.length * cutoff));

  const result = { words, wordFreq, normalizedMap };
  cache[key] = result;
  return result;
}

export function pickSecret(words) {
  return words[Math.floor(Math.random() * words.length)];
}
