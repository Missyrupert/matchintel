/**
 * Forecast Engine - produces probability forecasts from structured match data.
 * No prediction text, numeric probabilities only.
 */

/**
 * Convert form array (W/D/L) to points: W=3, D=1, L=0
 * @param {string[]} form
 * @returns {number}
 */
function formToPoints(form) {
  if (!Array.isArray(form) || form.length === 0) return 1.5; // neutral default
  const pts = { W: 3, D: 1, L: 0 };
  const total = form.reduce((s, r) => s + (pts[r] ?? 1), 0);
  return total / form.length;
}

/**
 * Softmax-style normalization to probabilities that sum to 1
 * @param {number[]} scores
 * @returns {number[]}
 */
function toProbabilities(scores) {
  const max = Math.max(...scores);
  const exp = scores.map((s) => Math.exp(s - max));
  const sum = exp.reduce((a, b) => a + b, 0);
  return exp.map((e) => e / sum);
}

/**
 * Sigmoid-like mapping to keep value in [0,1]
 * @param {number} x
 * @param {number} midpoint
 * @returns {number}
 */
function sigmoid(x, midpoint = 0.5) {
  return 1 / (1 + Math.exp(-8 * (x - midpoint)));
}

/**
 * Generate probability forecasts for match result, BTTS, and Over/Under 2.5
 * @param {Object} matchData - Output from buildMatchData()
 * @returns {Object} { resultForecast, bttsForecast, overUnder25 }
 */
export function generateForecast(matchData) {
  const { form, seasonStats, headToHead, leaguePosition } = matchData ?? {};

  const homeStats = seasonStats?.home ?? {};
  const awayStats = seasonStats?.away ?? {};
  const homePos = leaguePosition?.home;
  const awayPos = leaguePosition?.away;

  // --- Match Result (Home / Draw / Away) ---
  const homeFormPts = formToPoints(form?.home ?? []);
  const awayFormPts = formToPoints(form?.away ?? []);
  const formDiff = (homeFormPts - awayFormPts) / 3; // normalize to ~[-1,1]

  const homePlayed = homeStats.played || 1;
  const awayPlayed = awayStats.played || 1;
  const homeWinPct = (homeStats.won ?? 0) / homePlayed;
  const awayWinPct = (awayStats.won ?? 0) / awayPlayed;
  const winPctDiff = homeWinPct - awayWinPct;

  const homeGoalsFor = homeStats.goalsFor ?? 0;
  const homeGoalsAgainst = homeStats.goalsAgainst ?? 1;
  const awayGoalsFor = awayStats.goalsFor ?? 0;
  const awayGoalsAgainst = awayStats.goalsAgainst ?? 1;
  const homeAttack = homeGoalsFor / homePlayed;
  const homeDefense = homeGoalsAgainst / homePlayed;
  const awayAttack = awayGoalsFor / awayPlayed;
  const awayDefense = awayGoalsAgainst / awayPlayed;
  const homeGoalAdvantage = (homeAttack / (awayDefense || 0.5)) - (awayAttack / (homeDefense || 0.5));
  const goalAdvantage = homeGoalAdvantage / 2;

  let posDiff = 0;
  if (homePos?.position != null && awayPos?.position != null) {
    posDiff = (awayPos.position - homePos.position) / 20;
    posDiff = Math.max(-1, Math.min(1, posDiff));
  }

  let h2hHome = 0.33;
  let h2hDraw = 0.33;
  let h2hAway = 0.33;
  if (headToHead?.numberOfMatches > 0) {
    const n = headToHead.numberOfMatches;
    h2hHome = (headToHead.homeWins ?? 0) / n || 0.33;
    h2hDraw = (headToHead.draws ?? 0) / n || 0.33;
    h2hAway = (headToHead.awayWins ?? 0) / n || 0.33;
  }

  const homeBias =
    0.35 * formDiff +
    0.25 * winPctDiff +
    0.2 * Math.max(-1, Math.min(1, goalAdvantage)) +
    0.1 * posDiff +
    0.1 * ((h2hHome ?? 0.33) - 0.33);
  const awayBias =
    -0.35 * formDiff -
    0.25 * winPctDiff -
    0.2 * Math.max(-1, Math.min(1, goalAdvantage)) -
    0.1 * posDiff +
    0.1 * ((h2hAway ?? 0.33) - 0.33);
  const drawBias = 0.1 * ((h2hDraw ?? 0.33) - 0.33);

  const [homeWin, draw, awayWin] = toProbabilities([
    Math.exp(Math.max(-2, Math.min(2, homeBias))),
    0.9 * Math.exp(drawBias),
    Math.exp(Math.max(-2, Math.min(2, awayBias))),
  ]);

  const resultForecast = {
    homeWin: Math.round(homeWin * 100) / 100,
    draw: Math.round(draw * 100) / 100,
    awayWin: Math.round(awayWin * 100) / 100,
  };

  // --- BTTS (signals: scoring rates, defensive records) ---
  const homeScoringRate = homeAttack;
  const awayScoringRate = awayAttack;
  const homeConcedeRate = homeDefense;
  const awayConcedeRate = awayDefense;

  const homeScoresVsAwayDefense = homeScoringRate * Math.max(0.6, awayConcedeRate / 1.2);
  const awayScoresVsHomeDefense = awayScoringRate * Math.max(0.6, homeConcedeRate / 1.2);

  const pHomeScores = sigmoid(homeScoresVsAwayDefense, 1.0);
  const pAwayScores = sigmoid(awayScoresVsHomeDefense, 1.0);
  const bttsYesRaw = 0.6 * (pHomeScores * pAwayScores) + 0.4 * ((pHomeScores + pAwayScores) / 2);
  const bttsYes = Math.max(0.2, Math.min(0.85, bttsYesRaw));
  const bttsNo = 1 - bttsYes;

  const bttsForecast = {
    yes: Math.round(bttsYes * 100) / 100,
    no: Math.round(bttsNo * 100) / 100,
  };

  // --- Over/Under 2.5 ---
  const homeAvgGoals = homeAttack;
  const awayAvgGoals = awayAttack;
  const combinedAvg = homeAvgGoals + awayAvgGoals;

  const over25Raw = sigmoid(combinedAvg, 2.5);
  const over25 = Math.max(0.2, Math.min(0.85, over25Raw));
  const under25 = 1 - over25;

  const overUnder25 = {
    over: Math.round(over25 * 100) / 100,
    under: Math.round(under25 * 100) / 100,
  };

  return {
    resultForecast,
    bttsForecast,
    overUnder25,
  };
}
