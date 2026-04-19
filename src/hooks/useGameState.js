import { useState, useCallback } from 'react';
import { scoreguess, filterWords } from '../utils/wordle';
import { normalize } from '../utils/accents';
import { pickSecret } from '../utils/wordLists';

export const MAX_GUESSES = 6;

export function useGameState() {
  const [phase, setPhase] = useState('setup'); // 'setup'|'playing'|'won'|'lost'
  const [lang, setLang]           = useState('en');
  const [wordLength, setWordLength] = useState(5);
  const [secret, setSecret]       = useState('');
  const [allWords, setAllWords]   = useState([]);
  const [letterFreq, setLetterFreq] = useState({});
  const [normalizedMap, setNormalizedMap] = useState(new Map());
  const [remainingWords, setRemainingWords] = useState([]);
  const [guesses, setGuesses]     = useState([]); // [{word, colors}]
  const [currentInput, setCurrentInput] = useState('');
  const [error, setError]         = useState('');

  const startGame = useCallback((wordData, language, length) => {
    const { words, letterFreq: lf, normalizedMap: nm } = wordData;
    const secretWord = pickSecret(words);
    setSecret(secretWord);
    setAllWords(words);
    setLetterFreq(lf);
    setNormalizedMap(nm);
    setRemainingWords(words);
    setLang(language);
    setWordLength(length);
    setGuesses([]);
    setCurrentInput('');
    setError('');
    setPhase('playing');
  }, []);

  const submitGuess = useCallback((rawInput) => {
    const normInput = normalize(rawInput);

    if (normInput.length !== wordLength) {
      setError(`Word must be ${wordLength} letters`);
      return false;
    }

    // Look up the accented form (or use the input if not found)
    const accentedForm = normalizedMap.get(normInput);
    if (!accentedForm) {
      setError('Not in word list');
      return false;
    }

    const colors    = scoreguess(accentedForm, secret);
    const newGuess  = { word: accentedForm, colors };
    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);
    setCurrentInput('');
    setError('');

    const newRemaining = filterWords(remainingWords, accentedForm, colors);
    setRemainingWords(newRemaining);

    if (normalize(accentedForm) === normalize(secret)) {
      setPhase('won');
    } else if (newGuesses.length >= MAX_GUESSES) {
      setPhase('lost');
    }
    return true;
  }, [wordLength, normalizedMap, secret, guesses, remainingWords]);

  const resetGame = useCallback(() => {
    setPhase('setup');
    setGuesses([]);
    setCurrentInput('');
    setError('');
    setRemainingWords([]);
    setSecret('');
  }, []);

  // Map of letter → best known status (green > yellow > grey)
  const usedLetters = guesses.reduce((map, { word, colors }) => {
    normalize(word).split('').forEach((ch, i) => {
      const prev = map.get(ch);
      const cur  = colors[i];
      if (!prev || (prev === 'grey' && cur !== 'grey') || cur === 'green') {
        map.set(ch, cur);
      }
    });
    return map;
  }, new Map());

  return {
    phase, lang, wordLength, secret,
    allWords, letterFreq, remainingWords,
    guesses, currentInput, setCurrentInput,
    error, setError,
    startGame, submitGuess, resetGame,
    usedLetters,
  };
}
