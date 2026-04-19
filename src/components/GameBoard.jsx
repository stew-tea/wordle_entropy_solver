import Tile from './Tile';

export default function GameBoard({
  guesses, wordLength, maxGuesses, currentInput, currentRow, phase
}) {
  const rows = Array(maxGuesses).fill(null);

  return (
    <div className="game-board">
      {rows.map((_, rowIdx) => {
        const guess = guesses[rowIdx];
        const isCurrentRow = rowIdx === currentRow && phase === 'playing';

        return (
          <div key={rowIdx} className="board-row">
            {Array(wordLength).fill(null).map((_, colIdx) => {
              if (guess) {
                return (
                  <Tile
                    key={colIdx}
                    letter={guess.word[colIdx]}
                    color={guess.colors[colIdx]}
                    revealed={true}
                    delay={colIdx * 120}
                  />
                );
              }
              if (isCurrentRow) {
                return (
                  <Tile
                    key={colIdx}
                    letter={currentInput[colIdx] || ''}
                    color={null}
                    revealed={false}
                  />
                );
              }
              return <Tile key={colIdx} letter="" color={null} revealed={false} />;
            })}
          </div>
        );
      })}
    </div>
  );
}
