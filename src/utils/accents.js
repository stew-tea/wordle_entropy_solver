const MAP = { á:'a', é:'e', í:'i', ó:'o', ú:'u', ü:'u', ñ:'n' };

// Strip Spanish accents for comparison (display always uses the accented form)
export function normalize(word) {
  return word.toLowerCase().split('').map(c => MAP[c] ?? c).join('');
}

// Normalize a player's typed input, keeping only valid letters
export function normalizeInput(raw, lang) {
  // Allow accented chars through if already typed, then normalize for matching
  // Filter to alpha only (a-z plus accented for Spanish)
  const cleaned = lang === 'es'
    ? raw.toLowerCase().replace(/[^a-záéíóúüñ]/g, '')
    : raw.toLowerCase().replace(/[^a-z]/g, '');
  return cleaned;
}
