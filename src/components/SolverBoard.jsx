import { useState, useEffect, useRef } from 'react';
import Tile from './Tile';
import Keyboard from './Keyboard';
import { filterWords } from '../utils/wordle';
import { normalize, normalizeInput } from '../utils/accents';
import { top3Suggestions, explainSuggestion } from '../utils/entropy';

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

function SuggestionCard({ suggestion, remainingWords, usedLetters, isExpanded, onToggle }) {
  const explain = isExpanded
    ? explainSuggestion(suggestion.word, remainingWords, usedLetters)
    : null;

  return (
    <div className={`suggestion-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="suggestion-main">
        <span className="suggestion-word">{suggestion.word.toUpperCase()}</span>
        <span className="suggestion-pct">{suggestion.pct}% of top picks</span>
        <button className="btn-explain" onClick={onToggle}>
          {isExpanded ? 'Less' : 'Explain'}
        </button>
      </div>
      {isExpanded && explain && (
        <div className="suggestion-explain">
          <p className="explain-intro">This word tests:</p>
          <div className="explain-letters">
            {explain.map(({ letter, pct }) => (
              <span key={letter} className="explain-chip">
                <strong>{letter}</strong> in {pct}% of remaining words
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SolverBoard({ lang, wordLength, wordData, onBack }) {
  const { words: allWords, wordFreq, normalizedMap } = wordData;

  const [rows, setRows]                   = useState([]); // [{word, colors}] submitted
  const [currentInput, setCurrentInput]   = useState('');
  const [currentColors, setCurrentColors] = useState(() => Array(wordLength).fill('grey'));
  const [remainingWords, setRemainingWords] = useState(allWords);
  const [suggestions, setSuggestions]     = useState([]);
  const [computing, setComputing]         = useState(false);
  const [expandedIdx, setExpandedIdx]     = useState(null);
  const [error, setError]                 = useState('');
  const [solved, setSolved]               = useState(false);
  const inputRef = useRef(null);

  const usedLetters = buildUsedLetters(rows);

  // Recompute suggestions whenever remaining words change
  useEffect(() => {
    if (remainingWords.length === 0) { setSuggestions([]); return; }
    setComputing(true);
    const id = setTimeout(() => {
      setSuggestions(top3Suggestions(remainingWords, allWords, usedLetters, wordFreq));
      setComputing(false);
    }, 0);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingWords]);

  // Reset colors when input word changes
  useEffect(() => {
    setCurrentColors(Array(wordLength).fill('grey'));
  }, [currentInput, wordLength]);

  const cycleColor = (idx) => {
    if (!currentInput[idx]) return;
    setCurrentColors(prev => {
      const next = [...prev];
      next[idx] = COLOR_CYCLE[next[idx]];
      return next;
    });
  };

  const submitRow = () => {
    const norm = normalize(currentInput);
    if (norm.length !== wordLength) {
      setError(`Word must be ${wordLength} letters`);
      return;
    }
    const accentedForm = normalizedMap.get(norm);
    if (!accentedForm) {
      setError('Not in word list');
      return;
    }
    setError('');

    const colors   = currentColors.slice(0, wordLength);
    const newRow   = { word: accentedForm, colors };
    const newRows  = [...rows, newRow];
    setRows(newRows);
    setExpandedIdx(null);

    const newRemaining = filterWords(remainingWords, accentedForm, colors);
    setRemainingWords(newRemaining);

    if (colors.every(c => c === 'green')) {
      setSolved(true);
      return;
    }
    setCurrentInput('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInputChange = (e) => {
    const cleaned = normalizeInput(e.target.value, lang);
    if (cleaned.length <= wordLength) {
      setCurrentInput(cleaned);
      setError('');
    }
  };

  const isDone = solved || rows.length >= MAX_ROWS;
  const currentRowIdx = rows.length;

  return (
    <div className="solver-board">
      <div className="solver-header">
        <button className="btn-ghost btn-back" onClick={onBack}>← Back</button>
        <p className="solver-hint">
          Colour tiles to match your Wordle, then Submit Row
        </p>
      </div>

      {/* Grid */}
      <div className="game-board">
        {Array(MAX_ROWS).fill(null).map((_, rowIdx) => {
          const submitted = rows[rowIdx];
          const isCurrent = rowIdx === currentRowIdx && !isDone;

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
                if (isCurrent) {
                  const letter = currentInput[colIdx] || '';
                  return (
                    <Tile
                      key={colIdx}
                      letter={letter}
                      color={letter ? currentColors[colIdx] : null}
                      revealed={false}
                      onClick={letter ? () => cycleColor(colIdx) : undefined}
                    />
                  );
                }
                return <Tile key={colIdx} letter="" color={null} revealed={false} />;
              })}
            </div>
          );
        })}
      </div>

      {/* Input row */}
      {!isDone && (
        <div className="input-row">
          <input
            ref={inputRef}
            className="guess-input"
            type="text"
            value={currentInput}
            onChange={handleInputChange}
            onKeyDown={e => { if (e.key === 'Enter') submitRow(); }}
            maxLength={wordLength}
            placeholder={`Type a ${wordLength}-letter word`}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
          <button
            className="btn-primary"
            onClick={submitRow}
            disabled={currentInput.length !== wordLength}
          >
            Submit Row
          </button>
        </div>
      )}
      {error && <p className="error-msg">{error}</p>}

      {/* Colour hint */}
      {!isDone && currentInput.length > 0 && (
        <p className="color-hint">
          Click tiles to cycle colour: ⬜ → 🟨 → 🟩
        </p>
      )}

      {/* Solved banner */}
      {solved && (
        <div className="solver-banner win">
          Solved in {rows.length} {rows.length === 1 ? 'guess' : 'guesses'}! 🎉
          <button className="btn-ghost" onClick={onBack}>Play again</button>
        </div>
      )}
      {!solved && rows.length >= MAX_ROWS && (
        <div className="solver-banner lose">
          {remainingWords.length > 0
            ? `Hmm — ${remainingWords.length} word${remainingWords.length > 1 ? 's' : ''} still possible.`
            : "No matching words found — check your colours?"}
          <button className="btn-ghost" onClick={onBack}>Try again</button>
        </div>
      )}

      {/* Suggestions */}
      {!solved && (
        <div className="solver-suggestions">
          <h3 className="suggestions-title">
            {computing ? 'Computing suggestions…' : (
              remainingWords.length === 0
                ? 'No words match those constraints'
                : `${remainingWords.length.toLocaleString()} word${remainingWords.length !== 1 ? 's' : ''} remaining`
            )}
          </h3>
          {!computing && suggestions.length > 0 && (
            <>
              <p className="suggestions-sub">Top suggestions</p>
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={s.word}
                  suggestion={s}
                  remainingWords={remainingWords}
                  usedLetters={usedLetters}
                  isExpanded={expandedIdx === i}
                  onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                />
              ))}
            </>
          )}
        </div>
      )}

      <Keyboard usedLetters={usedLetters} />
    </div>
  );
}
