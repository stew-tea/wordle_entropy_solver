const MODES = [
  {
    id: 'play',
    icon: '🟩',
    title: 'Play Wordle',
    subtitle: 'Guess the secret word with AI hints',
  },
  {
    id: 'solve',
    icon: '🔍',
    title: 'Solve My Wordle',
    subtitle: 'Playing elsewhere? Get help cracking it',
  },
  {
    id: 'challenge',
    icon: '🤖',
    title: 'Challenge the AI',
    subtitle: "You know the word — can the AI guess it?",
  },
];

export default function ModeSelectScreen({ lang, wordLength, onSelect, onBack }) {
  return (
    <div className="mode-select-screen">
      <div className="mode-select-header">
        <button className="btn-ghost btn-back" onClick={onBack}>← Back</button>
        <p className="mode-select-sub">
          {lang === 'en' ? 'English' : 'Spanish'} · {wordLength} letters
        </p>
      </div>
      <h2 className="mode-select-title">Choose a mode</h2>
      <div className="mode-cards">
        {MODES.map(({ id, icon, title, subtitle }) => (
          <button
            key={id}
            className="mode-card"
            onClick={() => onSelect(id)}
          >
            <span className="mode-card-icon">{icon}</span>
            <span className="mode-card-title">{title}</span>
            <span className="mode-card-subtitle">{subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
