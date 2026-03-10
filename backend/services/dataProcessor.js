/**
 * Processes raw fixture data and builds match intelligence for the frontend
 */

import {
  fetchMatch,
  fetchTeamRecentMatches,
  fetchStandings,
  fetchHeadToHead,
} from './footballApi.js';

/**
 * Calculate form string (W/D/L) from matches, most recent first
 * @param {Object[]} matches - Matches with homeTeam, awayTeam, score
 * @param {number} teamId - Team ID to compute form for
 * @returns {string[]} e.g. ["W","D","W","L","W","W"]
 */
export function calculateForm(matches, teamId) {
  const form = [];
  for (const m of matches) {
    const score = m.score;
    if (!score?.winner) {
      form.push('D');
      continue;
    }
    const isHome = m.homeTeam?.id === teamId;
    const winner = score.winner;
    if (winner === 'DRAW') {
      form.push('D');
    } else if (
      (winner === 'HOME_TEAM' && isHome) ||
      (winner === 'AWAY_TEAM' && !isHome)
    ) {
      form.push('W');
    } else {
      form.push('L');
    }
  }
  return form;
}

/**
 * Fetch last N matches for a team
 * @param {number} teamId
 * @param {number} limit
 * @returns {Promise<Object[]>}
 */
export async function fetchTeamRecentMatchesFromApi(teamId, limit = 6) {
  return fetchTeamRecentMatches(teamId, limit);
}

/**
 * Extract season stats for a team from standings data
 * @param {Object} standingsData - From fetchStandings
 * @param {number} teamId
 * @returns {Object|null} { played, won, draw, lost, goalsFor, goalsAgainst, points } or null
 */
export function extractSeasonStatsFromStandings(standingsData, teamId) {
  const row = findTeamInStandings(standingsData, teamId);
  if (!row) return null;
  return {
    played: row.playedGames ?? 0,
    won: row.won ?? 0,
    draw: row.draw ?? 0,
    lost: row.lost ?? 0,
    goalsFor: row.goalsFor ?? 0,
    goalsAgainst: row.goalsAgainst ?? 0,
    points: row.points ?? 0,
  };
}

/**
 * Extract league position for a team from standings data
 * @param {Object} standingsData - From fetchStandings
 * @param {number} teamId
 * @returns {Object|null} { position, form } or null
 */
export function extractLeaguePositionFromStandings(standingsData, teamId) {
  const row = findTeamInStandings(standingsData, teamId);
  if (!row) return null;
  return {
    position: row.position ?? null,
    form: row.form ?? null,
  };
}

function findTeamInStandings(standingsData, teamId) {
  const standings = standingsData?.standings ?? [];
  const total = standings.find((s) => s.type === 'TOTAL');
  const table = total?.table ?? [];
  return table.find((row) => row.team?.id === teamId) ?? null;
}

/**
 * Fetch season stats for a team (requires standings - pass competitionCode to fetch)
 * @param {number} teamId
 * @param {string} competitionCode - e.g. PL, ELC
 * @returns {Promise<Object|null>}
 */
export async function fetchSeasonStats(teamId, competitionCode) {
  const standingsData = await fetchStandings(competitionCode);
  return extractSeasonStatsFromStandings(standingsData, teamId);
}

/**
 * Fetch league position for a team
 * @param {number} teamId
 * @param {string} competitionCode
 * @returns {Promise<Object|null>}
 */
export async function fetchLeaguePosition(teamId, competitionCode) {
  const standingsData = await fetchStandings(competitionCode);
  return extractLeaguePositionFromStandings(standingsData, teamId);
}

/**
 * Fetch head-to-head for a match
 * @param {number} matchId - Match ID (used to identify the two teams)
 * @returns {Promise<Object>}
 */
export async function fetchHeadToHeadForMatch(matchId) {
  return fetchHeadToHead(matchId);
}

/**
 * Build full match data for a fixture
 * @param {number} matchId
 * @returns {Promise<Object>}
 */
export async function buildMatchData(matchId) {
  const match = await fetchMatch(matchId);
  const homeTeamId = match.homeTeam?.id;
  const awayTeamId = match.awayTeam?.id;
  const homeTeamName = match.homeTeam?.name ?? 'Unknown';
  const awayTeamName = match.awayTeam?.name ?? 'Unknown';
  const competitionCode = match.competition?.code;

  if (!homeTeamId || !awayTeamId) {
    throw new Error('Match has no home or away team (possibly TBD)');
  }

  const [homeMatches, awayMatches, standingsData, h2hData] = await Promise.all([
    fetchTeamRecentMatches(homeTeamId, 6).catch(() => []),
    fetchTeamRecentMatches(awayTeamId, 6).catch(() => []),
    competitionCode ? fetchStandings(competitionCode).catch(() => null) : null,
    fetchHeadToHead(matchId).catch(() => null),
  ]);

  const homeForm = calculateForm(homeMatches, homeTeamId);
  const awayForm = calculateForm(awayMatches, awayTeamId);

  const homeStats = standingsData
    ? extractSeasonStatsFromStandings(standingsData, homeTeamId)
    : null;
  const awayStats = standingsData
    ? extractSeasonStatsFromStandings(standingsData, awayTeamId)
    : null;

  const homePosition = standingsData
    ? extractLeaguePositionFromStandings(standingsData, homeTeamId)
    : null;
  const awayPosition = standingsData
    ? extractLeaguePositionFromStandings(standingsData, awayTeamId)
    : null;

  const headToHead = h2hData
    ? {
        numberOfMatches: h2hData.numberOfMatches ?? 0,
        homeWins: h2hData.homeTeam?.wins ?? 0,
        awayWins: h2hData.awayTeam?.wins ?? 0,
        draws: h2hData.homeTeam?.draws ?? 0,
        totalGoals: h2hData.totalGoals ?? 0,
      }
    : null;

  return {
    fixtureId: matchId,
    league: match.competition?.name ?? '',
    utcDate: match.utcDate ?? null,
    homeTeam: homeTeamName,
    awayTeam: awayTeamName,
    form: {
      home: homeForm,
      away: awayForm,
    },
    seasonStats: {
      home: homeStats,
      away: awayStats,
    },
    headToHead,
    leaguePosition: {
      home: homePosition,
      away: awayPosition,
    },
  };
}

/**
 * Group fixtures by competition (league)
 * @param {Object[]} matches - Raw matches from football API
 * @returns {Object} Fixtures grouped by league name
 */
export function groupFixturesByLeague(matches) {
  const grouped = {};

  for (const match of matches) {
    const leagueName = match.competition?.name ?? 'Unknown League';
    if (!grouped[leagueName]) {
      grouped[leagueName] = [];
    }
    grouped[leagueName].push(transformFixture(match));
  }

  // Sort leagues: England first, then Scotland (Football-Data.org naming)
  const sortedGrouped = {};
  const englandLeagues = ['Premier League', 'Championship', 'League One', 'League Two'];
  const scotlandLeagues = ['Scottish Premiership', 'Scottish Championship', 'Scottish League One', 'Scottish League Two'];

  const allLeagues = [...englandLeagues, ...scotlandLeagues];
  const foundLeagues = Object.keys(grouped).sort((a, b) => {
    const ai = allLeagues.indexOf(a);
    const bi = allLeagues.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  for (const league of foundLeagues) {
    sortedGrouped[league] = grouped[league];
  }

  return sortedGrouped;
}

/**
 * Transform API match format to frontend-friendly shape
 * @param {Object} match - Raw match from API
 * @returns {Object}
 */
export function transformFixture(match) {
  return {
    id: match.id,
    homeTeam: match.homeTeam?.name ?? 'TBD',
    awayTeam: match.awayTeam?.name ?? 'TBD',
    league: match.competition?.name ?? '',
    utcDate: match.utcDate,
    status: match.status,
  };
}
