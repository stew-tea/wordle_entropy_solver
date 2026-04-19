import { useState } from 'react';

export default function SetupScreen({ onStart, loadingWords }) {
  const [lang, setLang]     = useState('en');
  const [length, setLength] = useState(5);

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h2>New Game</h2>

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

        <button
          className="btn-primary btn-large"
          onClick={() => onStart(lang, length)}
          disabled={loadingWords}
        >
          {loadingWords
            ? <><span className="spinner" />Loading words…</>
            : 'Start →'
          }
        </button>
      </div>
    </div>
  );
}
