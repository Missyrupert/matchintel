/**
 * Football-Data.org API service
 * Fetches fixtures and match data for UK leagues (England + Scotland)
 * API docs: https://www.football-data.org/documentation/api
 */

const BASE_URL = 'https://api.football-data.org/v4';

function getHeaders() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    throw new Error(
      'FOOTBALL_API_KEY not set. Get a free key at https://www.football-data.org/'
    );
  }
  return { 'X-Auth-Token': apiKey };
}

async function apiGet(url) {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Football API error (${response.status}): ${text}`);
  }
  return response.json();
}

// UK league codes from Football-Data.org
export const UK_LEAGUES = {
  england: {
    'Premier League': 'PL',
    Championship: 'ELC',
    'League One': 'EL1',
    'League Two': 'EL2',
  },
  scotland: {
    Premiership: 'SPL',
  },
};

const ALL_LEAGUE_CODES = Object.values(UK_LEAGUES)
  .flatMap((leagues) => Object.values(leagues))
  .filter(Boolean);

/**
 * Fetch fixtures for a date range from Football-Data.org
 * @param {string} dateFrom - Start date (YYYY-MM-DD)
 * @param {string} dateTo - End date (YYYY-MM-DD)
 * @returns {Promise<Object[]>} Array of matches
 */
export async function fetchFixtures(dateFrom, dateTo) {
  const competitionsParam = ALL_LEAGUE_CODES.join(',');
  const url = `${BASE_URL}/matches?competitions=${competitionsParam}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const data = await apiGet(url);
  return data.matches ?? [];
}

/**
 * Fetch a single match by ID
 * @param {number} matchId - Match ID
 * @returns {Promise<Object>}
 */
export async function fetchMatch(matchId) {
  const url = `${BASE_URL}/matches/${matchId}`;
  return apiGet(url);
}

/**
 * Fetch last N matches for a team (finished only)
 * @param {number} teamId - Team ID
 * @param {number} limit - Max matches to return (default 6)
 * @returns {Promise<Object[]>}
 */
export async function fetchTeamRecentMatches(teamId, limit = 6) {
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const dateFrom = sixMonthsAgo.toISOString().slice(0, 10);
  const url = `${BASE_URL}/teams/${teamId}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${today}&limit=${Math.max(limit, 20)}`;
  const data = await apiGet(url);
  const matches = data.matches ?? [];
  matches.sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
  return matches.slice(0, limit);
}

/**
 * Fetch standings for a competition (league table with season stats)
 * @param {string} competitionCode - Competition code (e.g. PL, ELC)
 * @returns {Promise<Object>}
 */
export async function fetchStandings(competitionCode) {
  const url = `${BASE_URL}/competitions/${competitionCode}/standings`;
  return apiGet(url);
}

/**
 * Fetch head-to-head results for a match (the two teams in that match)
 * @param {number} matchId - Match ID
 * @returns {Promise<Object>}
 */
export async function fetchHeadToHead(matchId) {
  const url = `${BASE_URL}/matches/${matchId}/head2head`;
  return apiGet(url);
}
