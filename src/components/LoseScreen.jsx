const COLOR_EMOJI = { green: '🟩', yellow: '🟨', grey: '⬜' };

export default function LoseScreen({ secret, guesses, onPlayAgain }) {
  const grid = guesses
    .map(({ colors }) => colors.map(c => COLOR_EMOJI[c]).join(''))
    .join('\n');
  const shareText = `Entropy Wordle — X/6\n\n${grid}`;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  };

  return (
    <div className="end-screen lose">
      <h2>Better luck next time</h2>
      <p className="end-label">The word was</p>
      <p className="end-word">{secret.toUpperCase()}</p>
      <pre className="emoji-grid">{grid}</pre>
      <div className="end-actions">
        <button className="btn-primary" onClick={handleShare}>Copy result</button>
        <button className="btn-secondary" onClick={onPlayAgain}>Play again</button>
      </div>
    </div>
  );
}
