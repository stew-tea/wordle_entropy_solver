# Entropy Wordle

A Wordle-style word-guessing game with an entropy-based AI suggestion engine. Built with React + Vite.

**Live demo:** https://stew-tea.github.io/entropy-wordle

---

## Features

- 🌐 English and Spanish word lists
- 📏 5, 6, or 7-letter word modes
- 🤖 Real-time entropy-based next-guess suggestions
- 🔤 Most informative letters panel
- 🎹 Colour-coded on-screen keyboard
- 🌙 Dark mode, mobile responsive
- 📋 Shareable emoji grid (like the real Wordle)

---

## The Entropy Algorithm

After each guess, the game computes **expected information entropy** for every word in the valid guess list against the set of still-possible secret words.

### How it works

1. For a candidate guess word **g**, simulate scoring it against every remaining possible secret word **w**.
2. This produces a distribution of colour patterns (e.g. `🟩🟨⬜⬜🟨`).
3. Compute the **Shannon entropy** of that distribution:

$$H(g) = -\sum_{p} P(p) \log_2 P(p)$$

where $P(p)$ is the fraction of remaining words that produce pattern $p$ for guess $g$.

4. The word with the **highest expected entropy** is displayed as the best guess — it splits the remaining search space most evenly, minimising expected guesses to solve.

### Key letters

The "key letters to try" panel ranks letters by how often they appear across all remaining possible words (excluding already-tried letters), surfacing the letters that would give the most information if their position were revealed.

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173/entropy-wordle/](http://localhost:5173/entropy-wordle/)

## Deploying to GitHub Pages

```bash
npm run deploy
```

This runs `vite build` then publishes the `dist/` folder to the `gh-pages` branch of your repo.

---

## Project structure

```
src/
├── data/           # Bundled word list JSONs (en5, en6, en7, es5, es6, es7)
├── components/     # React UI components
│   ├── SetupScreen.jsx
│   ├── GameBoard.jsx
│   ├── Tile.jsx
│   ├── Keyboard.jsx
│   ├── StatsPanel.jsx
│   ├── WinScreen.jsx
│   └── LoseScreen.jsx
├── hooks/
│   └── useGameState.js   # All game state and logic
├── utils/
│   ├── wordle.js         # Scoring + word filtering
│   ├── entropy.js        # Entropy computation + letter ranking
│   └── wordLists.js      # Dynamic JSON imports + random secret picker
├── App.jsx
└── App.css
```

---

## Tech stack

- [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- Pure CSS (no framework)
- [gh-pages](https://github.com/tschaub/gh-pages) for deployment
