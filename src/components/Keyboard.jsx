const ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

export default function Keyboard({ usedLetters }) {
  return (
    <div className="keyboard">
      {ROWS.map((row, i) => (
        <div key={i} className="keyboard-row">
          {row.map(key => {
            const status = usedLetters.get(key) || 'unused';
            return (
              <div key={key} className={`key ${status}`}>
                {key.toUpperCase()}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
