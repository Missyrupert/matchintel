import express from 'express';
import { buildMatchData } from '../services/dataProcessor.js';
import { generateForecast } from '../services/forecastEngine.js';
import { generateMatchInsight } from '../services/insightGenerator.js';
import { logPrediction } from '../services/predictionLogger.js';

const router = express.Router();

/**
 * POST /api/match-data/summaries
 * Fetches match data, generates forecast and insight for each selected fixture.
 *
 * Body: { fixtureIds: number[] }
 * Returns: { matches: [{ fixtureId, matchData, forecast, insight }] }
 */
router.post('/summaries', async (req, res) => {
  try {
    const { fixtureIds } = req.body ?? {};

    if (!Array.isArray(fixtureIds) || fixtureIds.length === 0) {
      return res.status(400).json({
        error: 'Expected body: { fixtureIds: number[] }',
      });
    }

    const results = await Promise.all(
      fixtureIds.map(async (id) => {
        try {
          const matchData = await buildMatchData(id);
          const forecast = generateForecast(matchData);
          const insight = generateMatchInsight(matchData, forecast);
          logPrediction(matchData, forecast, insight);
          return {
            fixtureId: id,
            matchData,
            forecast,
            insight,
          };
        } catch (err) {
          return {
            fixtureId: id,
            error: err.message ?? 'Failed to fetch match data',
          };
        }
      })
    );

    res.json({ matches: results });
  } catch (err) {
    console.error('Match data route error:', err);
    res.status(500).json({
      error: err.message ?? 'Failed to fetch match data',
    });
  }
});

export default router;
