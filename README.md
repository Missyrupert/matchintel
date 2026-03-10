# Match Insight Engine

A UK football match intelligence tool that retrieves fixtures and produces match summaries.

## Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Deploy**: Netlify (frontend), backend elsewhere (Railway, Render, etc.)

## Setup

### 1. Get a Football API key

Register for a free API key at [football-data.org](https://www.football-data.org/).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your FOOTBALL_API_KEY
npm install
npm start
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` (Vite dev server proxies `/api` to backend on port 3001).

## Netlify deployment

1. Connect this repo to Netlify: [github.com/Missyrupert/matchintel](https://github.com/Missyrupert/matchintel)
2. Build settings (in `netlify.toml`): base `frontend`, command `npm run build`, publish `dist`
3. Deploy the backend to Railway, Render, or similar
4. In Netlify: Redirect `/api/*` → `https://your-backend-url.com/api/:splat` (status 200)

## Project structure

```
match-insight-engine/
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── services/
│   └── utils/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
└── netlify.toml
```

## Features

- Date selector (today + 7 days)
- Auto-fetch fixtures from Football-Data.org for UK leagues
- Sequential match analysis with forecasts (result, BTTS, Over/Under 2.5)
- Prediction logging to `backend/data/predictions.json`
