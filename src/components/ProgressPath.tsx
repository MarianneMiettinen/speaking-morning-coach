export function ProgressPath({ total, current, accent }: { total: number; current: number; accent: string }) {
  const pct = total > 0 ? ((current + 1) / total) * 100 : 0;
  return (
    <div className="progress-path" aria-label={`Step ${current + 1} of ${total}`}>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: accent }} />
      </div>
      {total <= 12 && (
        <div className="progress-dots">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`progress-dot ${i <= current ? 'lit' : ''}`}
              style={i <= current ? { background: accent, boxShadow: `0 0 8px ${accent}aa` } : undefined}
            />
          ))}
        </div>
      )}
      <div className="progress-label">
        {current + 1} of {total}
      </div>
    </div>
  );
}
