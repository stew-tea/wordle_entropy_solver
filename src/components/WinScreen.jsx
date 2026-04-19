const COLOR_EMOJI = { green: '🟩', yellow: '🟨', grey: '⬜' };

function buildShareText(guesses) {
  const grid = guesses
    .map(({ colors }) => colors.map(c => COLOR_EMOJI[c]).join(''))
    .join('\n');
  return `Entropy Wordle — ${guesses.length}/6\n\n${grid}`;
}

export default function WinScreen({ secret, guesses, onPlayAgain }) {
  const shareText = buildShareText(guesses);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  return (
    <div className="end-screen win">
      <h2>You got it!</h2>
      <p className="end-word">{secret.toUpperCase()}</p>
      <p className="end-sub">Solved in <strong>{guesses.length}</strong> {guesses.length === 1 ? 'guess' : 'guesses'}</p>
      <pre className="emoji-grid">{buildShareText(guesses)}</pre>
      <div className="end-actions">
        <button className="btn-primary" onClick={handleShare}>Copy result</button>
        <button className="btn-secondary" onClick={onPlayAgain}>Play again</button>
      </div>
    </div>
  );
}
