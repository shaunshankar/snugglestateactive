# SnuggleState Lean

A full-stack weight loss and health tracking app built with React + Vite, Node.js/Express (Vercel Serverless Functions), Neon PostgreSQL, and the Anthropic Claude API.

Part of the **SnuggleState Life OS** — a suite of personal wellness apps.

## Features

- **Dashboard** — weight trend chart, today's calories/water, streak counter
- **Food Tracker** — AI-powered calorie estimation via Claude Haiku, manual entry fallback
- **Water Tracker** — tap-to-add with progress ring, cups/ml toggle
- **Goals** — daily goals with streak + confetti celebration, monthly goals with AUD rewards
- **Weight Log** — full history with edit/delete, kg/lbs toggle
- **Household** — share progress with family/friends, send cheers, read-only member profiles

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, Tailwind CSS, Recharts |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Neon PostgreSQL (`@neondatabase/serverless`) |
| Auth | JWT + bcryptjs |
| AI | Anthropic Claude Haiku 4.5 |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the database

Run `schema.sql` against your Neon database:

```bash
psql "$NEON_DATABASE_URL" -f schema.sql
```

Or paste the contents into the Neon SQL Editor.

### 3. Environment variables

A `.env` file is already configured. For Vercel deployment, add these via the Vercel dashboard or:

```bash
vercel env add NEON_DATABASE_URL
vercel env add ANTHROPIC_API_KEY
vercel env add JWT_SECRET
```

### 4. Run locally

In two terminals:

```bash
# Terminal 1 — API server
node server.js

# Terminal 2 — Vite dev server
npm run dev
```

App runs at `http://localhost:5173`

### 5. Deploy to Vercel

```bash
vercel deploy
```

For production:

```bash
vercel deploy --prod
```

## Project Structure

```
snugglestate-lean/
├── api/                    # Vercel Serverless Functions
│   ├── _auth.js            # JWT middleware
│   ├── _db.js              # Neon DB connection
│   ├── auth/
│   │   ├── signup.js
│   │   └── login.js
│   ├── ai/
│   │   ├── calories.js     # Claude Haiku calorie estimation
│   │   └── quote.js        # Motivational quote generation
│   ├── weight.js
│   ├── food.js
│   ├── water.js
│   ├── goals.js
│   ├── user.js
│   ├── household.js
│   └── notifications.js
├── src/
│   ├── components/
│   │   ├── Layout.jsx      # Nav + sidebar
│   │   ├── ProgressRing.jsx
│   │   ├── Skeleton.jsx
│   │   └── Toast.jsx
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── lib/
│   │   ├── api.js          # Fetch wrapper
│   │   └── utils.js        # Formatters
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── FoodTracker.jsx
│   │   ├── WaterTracker.jsx
│   │   ├── Goals.jsx
│   │   ├── WeightLog.jsx
│   │   ├── Household.jsx
│   │   ├── Login.jsx
│   │   └── Signup.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── schema.sql
├── server.js               # Local Express dev server
├── vercel.json
└── package.json
```

## Local dev notes

- The Vite dev server proxies `/api/*` to `localhost:3001` (the Express server)
- `server.js` dynamically imports API handlers — no restart needed on changes
- Vercel Serverless Functions run directly from `/api` in production

## Australian locale

- Dates: DD/MM/YYYY
- Currency: AUD ($) for reward amounts
- Weight: kg default (lbs toggle available)
