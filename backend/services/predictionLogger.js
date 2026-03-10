import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'predictions.json');

/**
 * Load existing predictions from file, or return empty array if file doesn't exist
 * @returns {Object[]}
 */
function loadPredictions() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * Ensure data directory and file exist
 */
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

/**
 * Append a prediction to predictions.json.
 * Skips logging if fixtureId already exists.
 * @param {Object} matchData - From buildMatchData (includes fixtureId, league, utcDate, homeTeam, awayTeam)
 * @param {Object} forecast - From generateForecast (resultForecast, bttsForecast, overUnder25)
 * @param {Object} insight - From generateMatchInsight (forecasts with labels)
 */
export function logPrediction(matchData, forecast, insight) {
  ensureDataFile();
  const predictions = loadPredictions();

  const fixtureId = matchData?.fixtureId;
  if (fixtureId == null) return;

  const alreadyLogged = predictions.some((p) => p.fixtureId === fixtureId);
  if (alreadyLogged) return;

  const record = {
    fixtureId,
    date: matchData?.utcDate ?? new Date().toISOString(),
    league: matchData?.league ?? '',
    homeTeam: matchData?.homeTeam ?? '',
    awayTeam: matchData?.awayTeam ?? '',
    forecastProbabilities: {
      resultForecast: forecast?.resultForecast ?? null,
      bttsForecast: forecast?.bttsForecast ?? null,
      overUnder25: forecast?.overUnder25 ?? null,
    },
    forecastLabels: {
      matchResult: insight?.forecasts?.matchResult ?? null,
      btts: insight?.forecasts?.btts ?? null,
      overUnder: insight?.forecasts?.overUnder ?? null,
    },
    loggedAt: new Date().toISOString(),
  };

  predictions.push(record);
  fs.writeFileSync(DATA_FILE, JSON.stringify(predictions, null, 2), 'utf8');
}
