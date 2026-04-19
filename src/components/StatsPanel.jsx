export default function StatsPanel({ remaining, suggestion, infoLetters, computing }) {
  const { word, narrowPct } = suggestion;

  return (
    <div className="stats-panel">
      <div className="stat">
        <span className="stat-label">Words remaining</span>
        <span className="stat-value">{remaining.toLocaleString()}</span>
      </div>
      <div className="stat stat-wide">
        <span className="stat-label">Best guess</span>
        {computing ? (
          <span className="stat-value muted">computing…</span>
        ) : word ? (
          <>
            <span className="stat-value highlight">{word.toUpperCase()}</span>
            <span className="stat-narrow">Narrows field by ~{narrowPct}%</span>
          </>
        ) : (
          <span className="stat-value muted">—</span>
        )}
      </div>
      <div className="stat">
        <span className="stat-label">Key letters</span>
        <span className="stat-value letters">
          {computing ? '…' : (infoLetters.length > 0 ? infoLetters.join(', ') : '—')}
        </span>
      </div>
    </div>
  );
}
