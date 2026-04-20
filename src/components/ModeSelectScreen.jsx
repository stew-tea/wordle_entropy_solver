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

// First screen shown — no lang/length selected yet, so we show no context badge.
export default function ModeSelectScreen({ onSelect }) {
  return (
    <div className="mode-select-screen">
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
