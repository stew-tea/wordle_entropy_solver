import { useState } from 'react';

const MODE_LABELS = {
  play:      '🟩 Play Wordle',
  solve:     '🔍 Solve My Wordle',
  challenge: '🤖 Challenge the AI',
};

const DIFFICULTIES = [
  { value: 'easy',   label: 'Easy',   hint: 'Top 40% most common words' },
  { value: 'medium', label: 'Medium', hint: 'Top 70% most common words' },
  { value: 'hard',   label: 'Hard',   hint: 'Full word list' },
];

export default function SetupScreen({ mode, onStart, onBack, loadingWords }) {
  const [lang, setLang]           = useState('en');
  const [length, setLength]       = useState(5);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="setup-screen">
      <div className="setup-card">
        {mode && (
          <div className="setup-mode-badge">{MODE_LABELS[mode]}</div>
        )}
        <h2>Choose your word</h2>

        <div className="setup-group">
          <label>Language</label>
          <div className="btn-group">
            {[['en', '🇬🇧 English'], ['es', '🇪🇸 Spanish']].map(([val, label]) => (
              <button
                key={val}
                className={`btn-toggle ${lang === val ? 'active' : ''}`}
                onClick={() => setLang(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-group">
          <label>Word Length</label>
          <div className="btn-group">
            {[5, 6, 7].map(n => (
              <button
                key={n}
                className={`btn-toggle ${length === n ? 'active' : ''}`}
                onClick={() => setLength(n)}
              >
                {n} letters
              </button>
            ))}
          </div>
        </div>

        <div className="setup-group">
          <label>Difficulty</label>
          <div className="btn-group">
            {DIFFICULTIES.map(({ value, label, hint }) => (
              <button
                key={value}
                className={`btn-toggle difficulty-${value} ${difficulty === value ? 'active' : ''}`}
                onClick={() => setDifficulty(value)}
                title={hint}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="setup-hint">
            {DIFFICULTIES.find(d => d.value === difficulty)?.hint}
          </p>
        </div>

        <div className="setup-actions">
          <button className="btn-ghost" onClick={onBack}>← Back</button>
          <button
            className="btn-primary btn-large"
            onClick={() => onStart(lang, length, difficulty)}
            disabled={loadingWords}
          >
            {loadingWords
              ? <><span className="spinner" />Loading…</>
              : 'Start →'
            }
          </button>
        </div>
      </div>
    </div>
  );
}
