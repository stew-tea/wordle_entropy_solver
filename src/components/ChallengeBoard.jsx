import { useState, useEffect } from 'react';
import Tile from './Tile';
import Keyboard from './Keyboard';
import { filterWords } from '../utils/wordle';
import { normalize } from '../utils/accents';
import { bestGuess } from '../utils/entropy';

const MAX_ROWS = 6;
const COLOR_CYCLE = { grey: 'yellow', yellow: 'green', green: 'grey' };

function buildUsedLetters(rows) {
  const map = new Map();
  for (const { word, colors } of rows) {
    normalize(word).split('').forEach((ch, i) => {
      const prev = map.get(ch);
      const cur  = colors[i];
      if (!prev || (prev === 'grey' && cur !== 'grey') || cur === 'green') {
        map.set(ch, cur);
      }
    });
  }
  return map;
}

export default function ChallengeBoard({ lang, wordLength, wordData, onBack }) {
  const { words: allWords, wordFreq } = wordData;

  const [rows, setRows]                     = useState([]);
  const [currentColors, setCurrentColors]   = useState(() => Array(wordLength).fill('grey'));
  const [remainingWords, setRemainingWords] = useState(allWords);
  const [aiGuess, setAiGuess]               = useState(null);
  const [phase, setPhase]                   = useState('guessing');
  const [guessCount, setGuessCount]         = useState(0);
  const [revealInput, setRevealInput]       = useState('');
  const [usedGuesses, setUsedGuesses]       = useState(new Set());

  const usedLetters = buildUsedLetters(rows);

  // Compute AI's first guess on mount (pure exploration — no feedback yet)
  useEffect(() => {
    const { word } = bestGuess(allWords, allWords, new Map(), wordFreq, new Set(), true);
    setAiGuess(word);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycleColor = (idx) => {
    if (!aiGuess) return;
    setCurrentColors(prev => {
      const next = [...prev];
      next[idx] = COLOR_CYCLE[next[idx]];
      return next;
    });
  };

  const submitColors = () => {
    if (!aiGuess) return;
    const colors  = currentColors.slice(0, wordLength);
    const newRow  = { word: aiGuess, colors };
    const newRows = [...rows, newRow];
    const newUsed = new Set([...usedGuesses, aiGuess]);
    setRows(newRows);
    setUsedGuesses(newUsed);

    // Check if AI won (all green)
    if (colors.every(c => c === 'green')) {
      setPhase('won');
      setGuessCount(newRows.length);
      return;
    }

    // Filter remaining words based on feedback
    const newRemaining = filterWords(remainingWords, aiGuess, colors);
    console.log(
      `[Challenge] After "${aiGuess}" ${colors.map(c=>c[0]).join('')}: ` +
      `${remainingWords.length} → ${newRemaining.length} words remaining`,
      newRemaining.slice(0, 10)
    );
    setRemainingWords(newRemaining);

    // Check if out of guesses
    if (newRows.length >= MAX_ROWS) {
      setPhase('lost');
      return;
    }

    // Check for impossible state (mismatched colours from player)
    if (newRemaining.length === 0) {
      console.warn('[Challenge] No words match — player may have coloured tiles incorrectly');
      setPhase('lost');
      return;
    }

    const newUsedLetters = buildUsedLetters(newRows);
    const { word: nextGuess } = bestGuess(
      newRemaining,
      allWords,
      newUsedLetters,
      wordFreq,
      newUsed,
      false,
    );

    // Safe fallback: never re-guess a used word
    const safeGuess = nextGuess
      ?? newRemaining.find(w => !newUsed.has(w))
      ?? newRemaining[0];
    console.log(`[Challenge] Next AI guess: ${safeGuess}`);

    setAiGuess(safeGuess);
    setCurrentColors(Array(wordLength).fill('grey'));
  };

  const currentRowIdx = rows.length;

  return (
    <div className="challenge-board">
      <div className="solver-header">
        <button className="btn-ghost btn-back" onClick={onBack}>← Back</button>
        <p className="solver-hint">
          Colour the tiles as you would in real Wordle
        </p>
      </div>

      {/* Grid */}
      <div className="game-board">
        {Array(MAX_ROWS).fill(null).map((_, rowIdx) => {
          const submitted = rows[rowIdx];
          const isCurrent = rowIdx === currentRowIdx && phase === 'guessing';

          return (
            <div key={rowIdx} className="board-row">
              {Array(wordLength).fill(null).map((_, colIdx) => {
                if (submitted) {
                  return (
                    <Tile
                      key={colIdx}
                      letter={submitted.word[colIdx]}
                      color={submitted.colors[colIdx]}
                      revealed
                      delay={colIdx * 100}
                    />
                  );
                }
                if (isCurrent && aiGuess) {
                  return (
                    <Tile
                      key={colIdx}
                      letter={aiGuess[colIdx] ?? ''}
                      color={currentColors[colIdx]}
                      revealed={false}
                      onClick={() => cycleColor(colIdx)}
                    />
                  );
                }
                return <Tile key={colIdx} letter="" color={null} revealed={false} />;
              })}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {phase === 'guessing' && aiGuess && (
        <div className="challenge-submit-area">
          <p className="challenge-ai-label">
            AI guesses: <strong>{aiGuess.toUpperCase()}</strong>
          </p>
          <p className="color-hint">Click tiles to colour them, then confirm</p>
          <button className="btn-primary" onClick={submitColors}>
            That's my answer →
          </button>
        </div>
      )}

      {/* Win */}
      {phase === 'won' && (
        <div className="solver-banner win">
          🤖 The AI cracked it in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}!
          <button className="btn-ghost" onClick={onBack}>Play again</button>
        </div>
      )}

      {/* Loss */}
      {phase === 'lost' && (
        <div className="solver-banner lose">
          <p>The AI couldn't crack it{remainingWords.length === 0 ? ' — did the colours match exactly?' : ''}.</p>
          <p className="challenge-reveal-prompt">What was the word?</p>
          <div className="challenge-reveal-row">
            <input
              className="guess-input"
              type="text"
              value={revealInput}
              onChange={e => setRevealInput(e.target.value.toLowerCase().slice(0, wordLength))}
              maxLength={wordLength}
              placeholder="Reveal the word"
              autoFocus
            />
          </div>
          {revealInput.length === wordLength && (
            <p className="reveal-word">{revealInput.toUpperCase()}</p>
          )}
          <button className="btn-ghost" onClick={onBack}>Play again</button>
        </div>
      )}

      <Keyboard usedLetters={usedLetters} />
    </div>
  );
}
