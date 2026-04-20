import { scoreguess, patternKey } from './wordle';
import { normalize } from './accents';


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

// Exploration score: word's real-world frequency (from wordfreq corpus).
// Common words are tried first — they're more likely to be the secret and
// tend to contain useful high-frequency letters anyway.
// Tiebreak: prefer words with no repeated letters (more letter diversity).
function explorationScore(word, wordFreq) {
  const norm   = normalize(word);
  const unique = new Set(norm);
  const noRepeat = unique.size === norm.length ? 1e-12 : 0;
  return (wordFreq[word] ?? 0) + noRepeat;
}

// ── Difficulty scoring ───────────────────────────────────────────────────────

// Difficulty uses word-level frequency: common word + high entropy = easy guess
export function scoreDifficulty(word, entropy, maxEntropy, wordFreq) {
  const entropyScore = maxEntropy > 0 ? entropy / maxEntropy : 0;
  // Normalise word frequency against a typical "common word" threshold (~0.001)
  const commonality  = Math.min((wordFreq[word] ?? 0) / 0.001, 1);
  const combined     = entropyScore * 0.6 + commonality * 0.4;

  if (combined > 0.65) return 'easy';
  if (combined > 0.40) return 'medium';
  return 'hard';
}

// ── Phase 1 — Exploration ────────────────────────────────────────────────────

function exploreGuess(allWords, wordFreq, exclude = new Set()) {
  let best = null;
  let bestScore = -1;
  for (const word of allWords) {
    if (exclude.has(word)) continue;
    const s = explorationScore(word, wordFreq);
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
  wordFreq,
  exclude = new Set(),
  forceExplore = false,
) {
  let word;

  if (forceExplore) {
    word = exploreGuess(allWords, wordFreq, exclude);
  } else {
    const confirmedCount = [...usedLetters.values()]
      .filter(s => s === 'green' || s === 'yellow').length;

    word = confirmedCount >= 3 || remainingWords.length < allWords.length
      ? exploitGuess(remainingWords, exclude)
      : exploreGuess(allWords, wordFreq, exclude);
  }

  if (!word || remainingWords.length === 0) return { word: null, narrowPct: 0 };

  const er = calcExpectedRemaining(word, remainingWords);
  const narrowPct = Math.round((1 - er / remainingWords.length) * 100);
  return { word, narrowPct };
}

// ── Public: top-3 suggestions for Solver mode ────────────────────────────────

export function top3Suggestions(remainingWords, allWords, usedLetters, wordFreq) {
  if (remainingWords.length === 0) return [];

  let candidates;
  if (remainingWords.length > 300) {
    // Pre-filter by word frequency to keep computation fast
    candidates = [...allWords]
      .map(w => ({ w, s: explorationScore(w, wordFreq) }))
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
    difficulty: scoreDifficulty(word, score, maxScore, wordFreq),
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
