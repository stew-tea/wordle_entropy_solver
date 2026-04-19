import { normalize } from './accents';

// Score a guess against a secret — both normalized so accents don't interfere
// Returns array of 'green' | 'yellow' | 'grey'
export function scoreguess(guess, secret) {
  const g = normalize(guess).split('');
  const s = normalize(secret).split('');
  const result = Array(g.length).fill('grey');
  const used   = Array(s.length).fill(false);

  for (let i = 0; i < g.length; i++) {
    if (g[i] === s[i]) { result[i] = 'green'; used[i] = true; }
  }
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'green') continue;
    for (let j = 0; j < s.length; j++) {
      if (!used[j] && g[i] === s[j]) {
        result[i] = 'yellow'; used[j] = true; break;
      }
    }
  }
  return result;
}

export function patternKey(colors) {
  return colors.map(c => c[0]).join('');
}

// Keep words whose normalized form is consistent with the guess → colors feedback
export function filterWords(words, guess, colors) {
  const key = patternKey(colors);
  return words.filter(word => patternKey(scoreguess(guess, word)) === key);
}
