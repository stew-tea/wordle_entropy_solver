import { useState, useEffect, useRef } from 'react';
import { useGameState, MAX_GUESSES } from './hooks/useGameState';
import { useTheme } from './hooks/useTheme';
import { bestGuess, topLetters } from './utils/entropy';
import { loadWordList } from './utils/wordLists';
import { normalizeInput } from './utils/accents';
import SetupScreen      from './components/SetupScreen';
import ModeSelectScreen from './components/ModeSelectScreen';
import GameBoard        from './components/GameBoard';
import Keyboard         from './components/Keyboard';
import StatsPanel       from './components/StatsPanel';
import WinScreen        from './components/WinScreen';
import LoseScreen       from './components/LoseScreen';
import SolverBoard      from './components/SolverBoard';
import ChallengeBoard   from './components/ChallengeBoard';
import './App.css';

// appPhase: 'mode-select' | 'setup' | 'play' | 'solve' | 'challenge'
export default function App() {
  const [appPhase, setAppPhase]       = useState('mode-select');
  const [pendingMode, setPendingMode] = useState(null);
  const [setup, setSetup]             = useState(null); // {lang, length, wordData}
  const [loadingWords, setLoadingWords] = useState(false);

  const game = useGameState();
  const { theme, toggle: toggleTheme } = useTheme();

  // Mode 1 entropy state
  const [suggestion, setSuggestion]   = useState({ word: null, narrowPct: 0 });
  const [infoLetters, setInfoLetters] = useState([]);
  const [computing, setComputing]     = useState(false);
  const inputRef = useRef(null);

  // Recompute suggestions for Mode 1
  useEffect(() => {
    if (appPhase !== 'play' || game.phase !== 'playing' || game.remainingWords.length === 0) return;
    setComputing(true);
    const id = setTimeout(() => {
      const result = bestGuess(game.remainingWords, game.allWords, game.usedLetters, game.wordFreq);
      setSuggestion(result);
      setInfoLetters(topLetters(game.remainingWords, new Set(game.usedLetters.keys())));
      setComputing(false);
    }, 0);
    return () => clearTimeout(id);
  }, [game.remainingWords, game.phase, appPhase]);

  // ── Mode selected → go to setup ───────────────────────────────────────────
  const handleModeSelect = (mode) => {
    setPendingMode(mode);
    setAppPhase('setup');
  };

  // ── Setup complete → start the chosen mode ─────────────────────────────────
  const handleSetupComplete = async (lang, length, difficulty) => {
    setLoadingWords(true);
    const wordData = await loadWordList(lang, length, difficulty);
    setLoadingWords(false);
    setSetup({ lang, length, difficulty, wordData });
    if (pendingMode === 'play') {
      game.startGame(wordData, lang, length, difficulty);
      setSuggestion({ word: null, narrowPct: 0 });
      setInfoLetters([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    setAppPhase(pendingMode);
  };

  const handleBack = () => setAppPhase('mode-select');

  // ── Mode 1 actions ─────────────────────────────────────────────────────────
  const handleSubmit = (rawInput) => {
    game.submitGuess(rawInput);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleUseSuggestion = () => {
    if (suggestion.word) {
      game.setCurrentInput(suggestion.word);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    const cleaned = normalizeInput(e.target.value, game.lang);
    if (cleaned.length <= game.wordLength) {
      game.setCurrentInput(cleaned);
      game.setError('');
    }
  };

  // ── Shared header ──────────────────────────────────────────────────────────
  const header = (
    <header className="app-header">
      <div className="header-left">
        <h1
          className="app-title"
          onClick={() => setAppPhase('mode-select')}
          title="Back to start"
        >
          Entropy Wordle
        </h1>
        {appPhase !== 'mode-select' && appPhase !== 'setup' && (
          <button className="btn-ghost" onClick={handleBack}>← Modes</button>
        )}
      </div>
      <button
        className={`theme-toggle ${theme}`}
        onClick={toggleTheme}
        aria-label="Toggle light/dark mode"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
    </header>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (appPhase === 'mode-select') {
    return (
      <div className="app">
        {header}
        <ModeSelectScreen onSelect={handleModeSelect} />
      </div>
    );
  }

  if (appPhase === 'setup') {
    return (
      <div className="app">
        {header}
        <SetupScreen
          mode={pendingMode}
          onStart={handleSetupComplete}
          onBack={() => setAppPhase('mode-select')}
          loadingWords={loadingWords}
        />
      </div>
    );
  }

  if (appPhase === 'solve') {
    return (
      <div className="app">
        {header}
        <SolverBoard
          lang={setup.lang}
          wordLength={setup.length}
          wordData={setup.wordData}
          difficulty={setup.difficulty}
          onBack={handleBack}
        />
      </div>
    );
  }

  if (appPhase === 'challenge') {
    return (
      <div className="app">
        {header}
        <ChallengeBoard
          lang={setup.lang}
          wordLength={setup.length}
          wordData={setup.wordData}
          difficulty={setup.difficulty}
          onBack={handleBack}
        />
      </div>
    );
  }

  // ── Mode 1: Play Wordle ────────────────────────────────────────────────────
  return (
    <div className="app">
      {header}

      {game.phase === 'won' && (
        <WinScreen secret={game.secret} guesses={game.guesses} onPlayAgain={handleBack} />
      )}
      {game.phase === 'lost' && (
        <LoseScreen secret={game.secret} guesses={game.guesses} onPlayAgain={handleBack} />
      )}

      {game.difficulty && (
        <div className={`difficulty-badge difficulty-${game.difficulty}`}>
          {game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1)}
        </div>
      )}

      <GameBoard
        guesses={game.guesses}
        wordLength={game.wordLength}
        maxGuesses={MAX_GUESSES}
        currentInput={game.phase === 'playing' ? game.currentInput : ''}
        currentRow={game.guesses.length}
        phase={game.phase}
      />

      {game.phase === 'playing' && (
        <>
          <div className="input-row">
            <input
              ref={inputRef}
              className="guess-input"
              type="text"
              value={game.currentInput}
              onChange={handleInputChange}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(game.currentInput); }}
              maxLength={game.wordLength}
              placeholder={`${game.wordLength}-letter word`}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className="btn-primary"
              onClick={() => handleSubmit(game.currentInput)}
              disabled={game.currentInput.length !== game.wordLength}
            >
              Guess
            </button>
            <button
              className="btn-secondary"
              onClick={handleUseSuggestion}
              disabled={!suggestion.word || computing}
              title="Fill input with top entropy suggestion"
            >
              Use suggestion
            </button>
          </div>

          {game.error && <p className="error-msg">{game.error}</p>}

          <StatsPanel
            remaining={game.remainingWords.length}
            suggestion={suggestion}
            infoLetters={infoLetters}
            computing={computing}
          />
        </>
      )}

      <Keyboard usedLetters={game.usedLetters} />
    </div>
  );
}
