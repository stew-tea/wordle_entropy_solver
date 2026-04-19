import { scoreguess, patternKey } from './wordle';
import { normalize } from './accents';

// ── Letter frequency table (general English text) ────────────────────────────
const LETTER_FREQ = {
  e: 12.5, t: 9.3, a: 8.0, o: 7.6, i: 7.0,
  n: 6.7,  s: 6.3, r: 6.0, h: 5.5, l: 4.0,
  d: 4.3,  c: 2.8, u: 2.8, m: 2.4, w: 2.4,
  f: 2.2,  g: 2.0, y: 2.0, p: 1.9, b: 1.5,
  v: 1.0,  k: 0.8, j: 0.15,x: 0.15,q: 0.1, z: 0.07,
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function patternCounts(candidate, remainingWords) {
  const counts = {};
  for (const word of remainingWords) {
    const key = patternKey(scoreguess(candidate, word));
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function calcEntropy(candidate, remainingWords) {
  const counts = patternCounts(candidate, remainingWords);
  const total  = remainingWords.length;
  let H = 0;
  for (const c of Object.values(counts)) {
    const p = c / total;
    H -= p * Math.log2(p);
  }
  return H;
}

function calcExpectedRemaining(candidate, remainingWords) {
  const counts = patternCounts(candidate, remainingWords);
  const total  = remainingWords.length;
  return Object.values(counts).reduce((s, c) => s + c * c, 0) / total;
}

// Exploration score: sum of corpus-freq for unique unguessed letters
function explorationScore(word, letterFreq, usedLetterKeys) {
  const norm   = normalize(word);
  const unique = new Set(norm);
  let score = 0;
  for (const ch of unique) {
    if (!usedLetterKeys.has(ch)) score += letterFreq[ch] ?? 0;
  }
  const noRepeat = unique.size === norm.length ? 1e-9 : 0;
  return score + noRepeat;
}

// ── Difficulty scoring ───────────────────────────────────────────────────────

/**
 * Score a word's "commonality" using English letter frequencies.
 * Uses unique letters only — repeated letters don't add extra commonality.
 * Returns a value roughly in the range 0–60 (sum of freq% for unique letters).
 */
function wordCommonality(word) {
  const unique = [...new Set(normalize(word))];
  return unique.reduce((sum, ch) => sum + (LETTER_FREQ[ch] ?? 0), 0);
}

/**
 * Determine difficulty of a suggestion word.
 *
 * Logic:
 *   - High entropy + common letters  → easy   (AI will likely guess it, player might too)
 *   - High entropy + uncommon letters → hard   (great split but obscure word)
 *   - Low entropy                    → hard   (doesn't narrow the pool well)
 *
 * entropyScore: normalised 0–1 (this word's entropy vs the max in the scored set)
 * commonality:  normalised 0–1 (sum of letter freq% / ~55 max for 5 unique common letters)
 *
 * combined = entropyScore * 0.6 + commonality * 0.4
 *   > 0.65 → easy
 *   > 0.40 → medium
 *   else   → hard
 */
export function scoreDifficulty(word, entropy, maxEntropy) {
  const entropyScore  = maxEntropy > 0 ? entropy / maxEntropy : 0;
  const commonality   = Math.min(wordCommonality(word) / 55, 1); // normalise
  const combined      = entropyScore * 0.6 + commonality * 0.4;

  if (combined > 0.65) return 'easy';
  if (combined > 0.40) return 'medium';
  return 'hard';
}

// ── Phase 1 — Exploration ────────────────────────────────────────────────────

function exploreGuess(allWords, usedLetterKeys, letterFreq, exclude = new Set()) {
  let best = null;
  let bestScore = -1;
  for (const word of allWords) {
    if (exclude.has(word)) continue;
    const s = explorationScore(word, letterFreq, usedLetterKeys);
    if (s > bestScore) { bestScore = s; best = word; }
  }
  return best;
}

// ── Phase 2 — Exploitation ───────────────────────────────────────────────────

function exploitGuess(remainingWords, exclude = new Set()) {
  const candidates = remainingWords.filter(w => !exclude.has(w));
  if (candidates.length <= 1) return candidates[0] ?? null;

  let best = null;
  let bestH = -1;
  for (const word of candidates) {
    const H = calcEntropy(word, remainingWords);
    if (H > bestH) { bestH = H; best = word; }
  }
  return best;
}

// ── Public: single best guess (used by Play mode and Challenge AI) ────────────
//
// forceExploit=false  → use phase logic (exploration vs exploitation)
// forceExploit=true   → always exploit (entropy on filtered pool)
// Pass forceExploit=false after first guess in Challenge mode so the AI
// always uses the narrowed remainingWords pool instead of searching allWords.

export function bestGuess(
  remainingWords,
  allWords,
  usedLetters,
  letterFreq,
  exclude = new Set(),
  forceExplore = false,   // true only for the very first guess (no feedback yet)
) {
  let word;

  if (forceExplore) {
    // First guess: explore all words for maximum letter coverage
    word = exploreGuess(allWords, new Set(usedLetters.keys()), letterFreq, exclude);
  } else {
    // All subsequent guesses: exploit the filtered pool via entropy
    // This ensures the AI never ignores its accumulated feedback.
    const confirmedCount = [...usedLetters.values()]
      .filter(s => s === 'green' || s === 'yellow').length;

    word = confirmedCount >= 3 || remainingWords.length < allWords.length
      ? exploitGuess(remainingWords, exclude)
      : exploreGuess(allWords, new Set(usedLetters.keys()), letterFreq, exclude);
  }

  if (!word || remainingWords.length === 0) return { word: null, narrowPct: 0 };

  const er = calcExpectedRemaining(word, remainingWords);
  const narrowPct = Math.round((1 - er / remainingWords.length) * 100);
  return { word, narrowPct };
}

// ── Public: top-3 suggestions for Solver mode ────────────────────────────────

export function top3Suggestions(remainingWords, allWords, usedLetters, letterFreq) {
  if (remainingWords.length === 0) return [];

  const usedKeys = new Set(usedLetters.keys());

  let candidates;
  if (remainingWords.length > 300) {
    candidates = [...allWords]
      .map(w => ({ w, s: explorationScore(w, letterFreq, usedKeys) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 200)
      .map(x => x.w);
  } else {
    candidates = remainingWords;
  }

  const scored = candidates.map(word => ({
    word,
    score: calcEntropy(word, remainingWords),
  }));
  scored.sort((a, b) => b.score - a.score);

  const top3     = scored.slice(0, 3);
  const total    = top3.reduce((s, x) => s + x.score, 0);
  const maxScore = top3[0]?.score ?? 0;

  return top3.map(({ word, score }) => ({
    word,
    pct: total > 0 ? Math.round((score / total) * 100) : Math.round(100 / top3.length),
    difficulty: scoreDifficulty(word, score, maxScore),
  }));
}

// ── Public: explain a suggestion ─────────────────────────────────────────────

export function explainSuggestion(word, remainingWords, usedLetters) {
  const total  = remainingWords.length || 1;
  const unique = [...new Set(normalize(word))];
  return unique
    .filter(ch => usedLetters.get(ch) !== 'green')
    .map(ch => {
      const count = remainingWords.filter(w => normalize(w).includes(ch)).length;
      return { letter: ch.toUpperCase(), pct: Math.round((count / total) * 100) };
    });
}

// ── Public: top informative letters ──────────────────────────────────────────

export function topLetters(remainingWords, usedLetterKeys) {
  const freq = {};
  for (const word of remainingWords) {
    const seen = new Set();
    for (const ch of normalize(word)) {
      if (!seen.has(ch) && !usedLetterKeys.has(ch)) {
        freq[ch] = (freq[ch] || 0) + 1;
        seen.add(ch);
      }
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ch]) => ch.toUpperCase());
}
