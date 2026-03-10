import express from 'express';
import { fetchFixtures } from '../services/footballApi.js';
import { groupFixturesByLeague } from '../services/dataProcessor.js';
import { isValidDate, isValidDateRange } from '../utils/validation.js';

const router = express.Router();

/**
 * GET /api/fixtures?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Returns fixtures grouped by league for the given date range
 */
router.get('/', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Missing required query params: dateFrom, dateTo (format: YYYY-MM-DD)',
      });
    }

    if (!isValidDateRange(dateFrom, dateTo)) {
      return res.status(400).json({
        error: 'Invalid date range. Use YYYY-MM-DD format and ensure dateFrom <= dateTo',
      });
    }

    const matches = await fetchFixtures(dateFrom, dateTo);
    const grouped = groupFixturesByLeague(matches);

    res.json({
      dateFrom,
      dateTo,
      fixtures: grouped,
    });
  } catch (err) {
    console.error('Fixtures route error:', err);
    res.status(500).json({
      error: err.message ?? 'Failed to fetch fixtures',
    });
  }
});

export default router;
