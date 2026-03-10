import MatchCard from './MatchCard';

export default function FixtureList({ fixtures, insights = {}, analysingFixture }) {
  const leagues = Object.entries(fixtures ?? {});
  const isAnalysing = !!analysingFixture;

  if (leagues.length === 0) {
    return (
      <p className="fixture-list-empty">
        No fixtures found. Try a different date or check the backend is running on port 3001.
      </p>
    );
  }

  return (
    <div className="fixture-list">
      {isAnalysing && (
        <div className="progress-message progress-loading">
          Analysing {analysingFixture.homeTeam} vs {analysingFixture.awayTeam}...
        </div>
      )}

      {leagues.map(([league, matches]) => (
        <section key={league} className="fixture-league">
          <h3>{league}</h3>
          <div className="fixture-cards">
            {matches.map((fixture) => (
              <MatchCard
                key={fixture.id}
                fixture={fixture}
                insight={insights[fixture.id]}
                isAnalysing={isAnalysing && analysingFixture?.id === fixture.id}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
