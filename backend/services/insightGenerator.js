/**
 * Match Insight Generator - converts forecast and match data into readable report text.
 * All reasoning must derive from real statistical comparisons. No invented information.
 */

/**
 * Map match result probabilities to a simple text label
 * @param {Object} resultForecast - { homeWin, draw, awayWin }
 * @returns {string}
 */
function formatMatchResultForecast(resultForecast) {
  const { homeWin = 0.33, draw = 0.33, awayWin = 0.33 } = resultForecast ?? {};
  const max = Math.max(homeWin, draw, awayWin);

  if (max === homeWin) {
    if (homeWin >= 0.5) return 'Home win more likely';
    if (homeWin >= 0.4) return 'Home win slightly favoured';
    return 'Home win marginally favoured';
  }
  if (max === awayWin) {
    if (awayWin >= 0.5) return 'Away win more likely';
    if (awayWin >= 0.4) return 'Away win slightly favoured';
    return 'Away win marginally favoured';
  }
  if (draw >= 0.35) return 'Draw quite likely';
  if (draw >= 0.28) return 'Draw possible';
  return 'Draw marginally favoured';
}

/**
 * Map BTTS probability to text
 * @param {number} bttsYes
 * @returns {string}
 */
function formatBttsForecast(bttsYes) {
  if (bttsYes >= 0.65) return 'Likely';
  if (bttsYes >= 0.55) return 'Moderately likely';
  if (bttsYes >= 0.45) return 'Evenly balanced';
  if (bttsYes >= 0.35) return 'Moderately unlikely';
  return 'Unlikely';
}

/**
 * Map Over/Under probability to text
 * @param {number} overProb
 * @returns {string}
 */
function formatOverUnderForecast(overProb) {
  if (overProb >= 0.65) return 'Over strongly favoured';
  if (overProb >= 0.55) return 'Over favoured';
  if (overProb >= 0.5) return 'Over slightly favoured';
  if (overProb >= 0.45) return 'Under slightly favoured';
  if (overProb >= 0.35) return 'Under favoured';
  return 'Under strongly favoured';
}

/**
 * Derive reasoning statements from match data and forecast.
 * Only include statements backed by actual data.
 * @param {Object} matchData
 * @param {Object} forecast
 * @returns {string[]}
 */
function buildReasoning(matchData, forecast) {
  const reasoning = [];
  const { form, seasonStats, headToHead, leaguePosition } = matchData ?? {};
  const { resultForecast, bttsForecast, overUnder25 } = forecast ?? {};

  const homeStats = seasonStats?.home ?? {};
  const awayStats = seasonStats?.away ?? {};
  const homePos = leaguePosition?.home;
  const awayPos = leaguePosition?.away;
  const homePlayed = homeStats.played || 1;
  const awayPlayed = awayStats.played || 1;

  if (homePos?.position != null && awayPos?.position != null) {
    if (homePos.position < awayPos.position) {
      reasoning.push('Home team higher in league table');
    } else if (homePos.position > awayPos.position) {
      reasoning.push('Away team higher in league table');
    }
  }

  if (Array.isArray(form?.home) && form.home.length > 0 && Array.isArray(form?.away) && form.away.length > 0) {
    const homeWins = form.home.filter((r) => r === 'W').length;
    const homeDraws = form.home.filter((r) => r === 'D').length;
    const homeLosses = form.home.filter((r) => r === 'L').length;
    const awayWins = form.away.filter((r) => r === 'W').length;
    const awayDraws = form.away.filter((r) => r === 'D').length;
    const awayLosses = form.away.filter((r) => r === 'L').length;
    const homePts = homeWins * 3 + homeDraws;
    const awayPts = awayWins * 3 + awayDraws;

    if (homePts > awayPts) {
      reasoning.push('Home team better recent form');
    } else if (awayPts > homePts) {
      reasoning.push('Away team better recent form');
    }
  }

  if (homeStats.played > 0 && awayStats.played > 0) {
    const homeWinPct = (homeStats.won ?? 0) / homePlayed;
    const awayWinPct = (awayStats.won ?? 0) / awayPlayed;
    if (homeWinPct > awayWinPct + 0.1) {
      reasoning.push('Home team higher season win rate');
    } else if (awayWinPct > homeWinPct + 0.1) {
      reasoning.push('Away team higher season win rate');
    }
  }

  if (homeStats.goalsFor != null && awayStats.goalsFor != null && homePlayed > 0 && awayPlayed > 0) {
    const homeGpg = homeStats.goalsFor / homePlayed;
    const awayGpg = awayStats.goalsFor / awayPlayed;
    if (homeGpg > awayGpg + 0.3) {
      reasoning.push('Home team scoring more this season');
    } else if (awayGpg > homeGpg + 0.3) {
      reasoning.push('Away team scoring more this season');
    }
  }

  if (homeStats.goalsAgainst != null && awayStats.goalsAgainst != null && homePlayed > 0 && awayPlayed > 0) {
    const homeConcedePerGame = homeStats.goalsAgainst / homePlayed;
    const awayConcedePerGame = awayStats.goalsAgainst / awayPlayed;
    if (homeConcedePerGame < awayConcedePerGame - 0.2) {
      reasoning.push('Home team stronger defensively');
    } else if (awayConcedePerGame < homeConcedePerGame - 0.2) {
      reasoning.push('Away team stronger defensively');
    }
  }

  if (headToHead?.numberOfMatches > 0) {
    const { homeWins = 0, awayWins = 0, draws = 0 } = headToHead;
    if (homeWins > awayWins) {
      reasoning.push(`Head-to-head: home team leads (${homeWins}-${awayWins}-${draws})`);
    } else if (awayWins > homeWins) {
      reasoning.push(`Head-to-head: away team leads (${homeWins}-${awayWins}-${draws})`);
    } else if (draws > 0 && homeWins === awayWins) {
      reasoning.push(`Head-to-head: ${draws} draws in ${headToHead.numberOfMatches} meetings`);
    }
  }

  return reasoning;
}

/**
 * Generate structured match insight for the frontend
 * @param {Object} matchData - Output from buildMatchData()
 * @param {Object} forecast - Output from forecastEngine.generateForecast()
 * @returns {Object}
 */
export function generateMatchInsight(matchData, forecast) {
  const { homeTeam = '', awayTeam = '' } = matchData ?? {};
  const { form, seasonStats, headToHead, leaguePosition } = matchData ?? {};
  const { resultForecast, bttsForecast, overUnder25 } = forecast ?? {};

  const overview = {
    homeTeam,
    awayTeam,
  };

  const formSummary = {
    home: Array.isArray(form?.home) ? [...form.home] : [],
    away: Array.isArray(form?.away) ? [...form.away] : [],
  };

  const positionSummary = {
    home: leaguePosition?.home?.position ?? null,
    away: leaguePosition?.away?.position ?? null,
  };

  const headToHeadSummary = {
    homeWins: headToHead?.homeWins ?? 0,
    awayWins: headToHead?.awayWins ?? 0,
    draws: headToHead?.draws ?? 0,
  };

  const forecasts = {
    matchResult: formatMatchResultForecast(resultForecast),
    btts: formatBttsForecast(bttsForecast?.yes ?? 0.5),
    overUnder: formatOverUnderForecast(overUnder25?.over ?? 0.5),
  };

  const reasoning = buildReasoning(matchData, forecast);

  return {
    overview,
    formSummary,
    positionSummary,
    headToHeadSummary,
    forecasts,
    reasoning,
  };
}
