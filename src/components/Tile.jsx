import { useEffect, useState } from 'react';

// Modes:
//   normal   – standard flipping tile (Mode 1)
//   input    – interactive, click cycles color grey→yellow→green→grey
export default function Tile({
  letter,
  color,       // 'green' | 'yellow' | 'grey' | null
  revealed,    // triggers flip animation (normal mode)
  delay = 0,
  onClick,     // if set → interactive tile (no flip, cursor pointer)
}) {
  const [flipped, setFlipped] = useState(false);
  const interactive = !!onClick;

  useEffect(() => {
    if (interactive || !revealed) return;
    const id = setTimeout(() => setFlipped(true), delay);
    return () => clearTimeout(id);
  }, [revealed, delay, interactive]);

  // In interactive mode: use color directly as class (no flip)
  // In normal mode: show 'filled' on front until flipped
  let stateClass;
  if (interactive) {
    stateClass = color ?? 'grey';
  } else {
    stateClass = flipped ? (color ?? 'grey') : (letter ? 'filled' : 'empty');
  }

  const handleClick = () => {
    if (interactive && letter && onClick) onClick();
  };

  return (
    <div
      className={`tile ${stateClass} ${flipped ? 'flipped' : ''} ${interactive ? 'interactive' : ''}`}
      style={!interactive ? { animationDelay: `${delay}ms` } : undefined}
      onClick={handleClick}
      role={interactive && letter ? 'button' : undefined}
      tabIndex={interactive && letter ? 0 : undefined}
      onKeyDown={interactive && letter ? e => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
    >
      <div className="tile-inner">
        <div className="tile-front">{letter?.toUpperCase()}</div>
        <div className="tile-back">{letter?.toUpperCase()}</div>
      </div>
    </div>
  );
}
