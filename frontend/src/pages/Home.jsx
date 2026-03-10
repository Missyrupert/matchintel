import { useState, useCallback, useRef } from 'react';
import DateSelector from '../components/DateSelector';
import FixtureList from '../components/FixtureList';
import { fetchFixtures, generateSummaries } from '../services/api';

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function flattenFixtures(fixturesByLeague) {
  const list = [];
  for (const matches of Object.values(fixturesByLeague ?? {})) {
    for (const f of matches) {
      list.push(f);
    }
  }
  return list;
}

export default function Home() {
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [fixtures, setFixtures] = useState({});
  const [insights, setInsights] = useState({});
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [analysingFixture, setAnalysingFixture] = useState(null);
  const [error, setError] = useState(null);

  const analysisRunRef = useRef(0);

  const handleGetMatches = useCallback(async () => {
    setLoadingFixtures(true);
    setError(null);
    setInsights({});
    setAnalysingFixture(null);
    analysisRunRef.current += 1;
    const thisRun = analysisRunRef.current;

    try {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + 2);
      const dateTo = formatDate(d);
      const data = await fetchFixtures(selectedDate, dateTo);
      const fixtureData = data.fixtures ?? {};

      if (thisRun !== analysisRunRef.current) return;

      setFixtures(fixtureData);

      const allFixtures = flattenFixtures(fixtureData);
      if (allFixtures.length === 0) {
        setLoadingFixtures(false);
        return;
      }

      setLoadingFixtures(false);

      for (let i = 0; i < allFixtures.length; i++) {
        if (thisRun !== analysisRunRef.current) return;
        // 4s delay between requests to avoid hitting Football-Data.org API rate limit
        if (i > 0) await new Promise((resolve) => setTimeout(resolve, 4000));
        const fixture = allFixtures[i];
        setAnalysingFixture(fixture);

        try {
          const { matches } = await generateSummaries([fixture.id]);
          if (thisRun !== analysisRunRef.current) return;

          const m = matches?.[0];
          setInsights((prev) => ({
            ...prev,
            [fixture.id]: m?.error
              ? { error: m.error }
              : {
                  matchData: m?.matchData,
                  forecast: m?.forecast,
                  insight: m?.insight,
                },
          }));
        } catch (err) {
          if (thisRun !== analysisRunRef.current) return;
          setInsights((prev) => ({
            ...prev,
            [fixture.id]: { error: err.message },
          }));
        }
      }
    } catch (err) {
      setError(err.message);
      setFixtures({});
    } finally {
      setLoadingFixtures(false);
      setAnalysingFixture(null);
    }
  }, [selectedDate]);

  return (
    <main className="home">
      <header className="page-header">
        <h1>Match Insight Engine</h1>
        <p>UK football match intelligence</p>
      </header>

      <section className="controls">
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
        <button onClick={handleGetMatches} disabled={loadingFixtures}>
          {loadingFixtures ? 'Loading…' : 'Get Matches'}
        </button>
      </section>

      {error && <div className="error-message">{error}</div>}

      <FixtureList
        fixtures={fixtures}
        insights={insights}
        analysingFixture={analysingFixture}
      />
    </main>
  );
}
