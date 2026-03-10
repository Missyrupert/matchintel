const API_BASE = '/api';

/**
 * Fetch fixtures for a date range
 * @param {string} dateFrom - YYYY-MM-DD
 * @param {string} dateTo - YYYY-MM-DD
 * @returns {Promise<{ fixtures: Object }>}
 */
export async function fetchFixtures(dateFrom, dateTo) {
  const params = new URLSearchParams({ dateFrom, dateTo });
  const res = await fetch(`${API_BASE}/fixtures?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to fetch fixtures');
  }
  return res.json();
}

/**
 * Request match insights (matchData, forecast, insight) for selected fixtures
 * @param {number[]} fixtureIds
 * @returns {Promise<{ matches: Array<{ fixtureId, matchData, forecast, insight }> }>}
 */
export async function generateSummaries(fixtureIds) {
  const res = await fetch(`${API_BASE}/match-data/summaries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fixtureIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Failed to generate summaries');
  }
  return res.json();
}
