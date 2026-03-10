export default function MatchCard({ fixture, insight, isAnalysing }) {
  const hasInsight = insight?.insight && !insight?.error;
  const hasError = insight?.error;

  if (isAnalysing) {
    return (
      <div className="match-card match-card-loading">
        <div className="match-card-collapsed">
          <span className="card-teams">{fixture.homeTeam} vs {fixture.awayTeam}</span>
          <span className="card-status">Analysing...</span>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="match-card match-card-error">
        <div className="match-card-collapsed">
          <span className="card-teams">{fixture.homeTeam} vs {fixture.awayTeam}</span>
          <span className="card-status card-error" title={insight.error}>Error</span>
        </div>
      </div>
    );
  }

  if (!hasInsight) {
    return (
      <div className="match-card match-card-pending">
        <div className="match-card-collapsed">
          <span className="card-teams">{fixture.homeTeam} vs {fixture.awayTeam}</span>
          <span className="card-status">Pending</span>
        </div>
      </div>
    );
  }

  const { overview, formSummary, positionSummary, headToHeadSummary, forecasts, reasoning } =
    insight.insight;

  return (
    <details className="match-card match-card-ready">
      <summary className="match-card-collapsed">
        <span className="card-teams">
          {overview?.homeTeam ?? fixture.homeTeam} vs {overview?.awayTeam ?? fixture.awayTeam}
        </span>
        <span className="card-forecasts">
          <span className="forecast-pill">{forecasts?.matchResult ?? '–'}</span>
          <span className="forecast-pill">BTTS: {forecasts?.btts ?? '–'}</span>
          <span className="forecast-pill">O/U 2.5: {forecasts?.overUnder ?? '–'}</span>
        </span>
      </summary>
      <div className="match-card-expanded">
        {/* Form */}
        {(formSummary?.home?.length > 0 || formSummary?.away?.length > 0) && (
          <section className="card-section">
            <h4>Form (last 6)</h4>
            <div className="insight-form">
              <span className="form-badges home">
                {(formSummary.home ?? []).map((r, i) => (
                  <span key={i} className={`badge badge-${r.toLowerCase()}`}>{r}</span>
                ))}
              </span>
              <span className="form-vs">vs</span>
              <span className="form-badges away">
                {(formSummary.away ?? []).map((r, i) => (
                  <span key={i} className={`badge badge-${r.toLowerCase()}`}>{r}</span>
                ))}
              </span>
            </div>
          </section>
        )}

        {/* League position */}
        {(positionSummary?.home != null || positionSummary?.away != null) && (
          <section className="card-section">
            <h4>League position</h4>
            <p>{positionSummary?.home ?? '–'} vs {positionSummary?.away ?? '–'}</p>
          </section>
        )}

        {/* Head-to-head */}
        {headToHeadSummary &&
          (headToHeadSummary.homeWins > 0 ||
            headToHeadSummary.awayWins > 0 ||
            headToHeadSummary.draws > 0) && (
            <section className="card-section">
              <h4>Head-to-head</h4>
              <p>
                {headToHeadSummary.homeWins} – {headToHeadSummary.draws} – {headToHeadSummary.awayWins}
              </p>
            </section>
          )}

        {/* Reasoning */}
        {reasoning?.length > 0 && (
          <section className="card-section">
            <h4>Key factors</h4>
            <ul className="insight-reasoning">
              {reasoning.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}
