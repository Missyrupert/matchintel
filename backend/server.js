import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import fixturesRoutes from './routes/fixtures.js';
import matchDataRoutes from './routes/matchData.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/fixtures', fixturesRoutes);
app.use('/api/match-data', matchDataRoutes);

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Match Insight Engine API running on http://localhost:${PORT}`);
});
