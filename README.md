# PhishGuard — AI Phishing Detection Platform

A full-stack web app that scans URLs and email/message content for phishing
risk, combining a hand-written rule engine, a trained ML model, a live
domain-age lookup, and an optional real threat-intel API into one ensemble
risk score. Backed by a real Postgres database, deployable to Vercel.

## Stack
- **Framework:** Next.js 16 (App Router) — frontend + backend API routes in one project
- **Styling:** Tailwind CSS, Framer Motion for page/result transitions
- **Database:** Postgres (via `pg`) — schema self-migrates on first run, works with Supabase/Neon/Railway free tiers or a local Postgres
- **Auth:** JWT stored in an HTTP-only cookie, passwords hashed with bcrypt
- **Testing:** Vitest — 18 unit tests covering the detection engine, ML model, and rate limiter
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — runs tests, lint, and build on every push/PR
- **Detection:** an ensemble of up to four independent signals, combined in `lib/ensemble.js` + the scan route:
  1. A hand-written rule engine (`lib/detection.js`) — HTTPS check, domain structure, brand impersonation, keywords (admin-extendable), etc.
  2. A **trained Logistic Regression ML model** (`lib/mlModel.js` + `lib/model.json`) — trained offline in Python (see `ml/`) on ~2,000 real labeled phishing/legitimate URLs, 83.6% test accuracy
  3. A real **domain-age lookup** (`lib/domainAge.js`) via RDAP — flags very recently registered domains
  4. **Optional live VirusTotal check** (`lib/virustotal.js`) — real blacklist data from 70+ security engines, only runs if you set an API key

## Features
- Register / login / logout (first registered user automatically becomes **admin**) — rate-limited against brute force
- URL Scanner — combines all four detection signals into one risk score, shows the breakdown
- Email Analyzer — paste email/message text, get flagged phishing signals
- Personal dashboard with scan stats
- Scan history table
- Threat Reports — generate a written report from any past scan, view them under "Reports"
- Admin panel: analytics, user management (promote/demote), full scan logs with filters, manage custom suspicious keywords, view all generated reports
- Rate limiting on login, registration, and scan endpoints

---

## Getting a free Postgres database (2 minutes)

Pick one — all have generous free tiers and work identically here:

**Supabase** (recommended, easiest)
1. Go to supabase.com → New Project
2. Once created, go to Project Settings → Database → Connection String → "URI" (use the **pooled connection**, port 6543, for serverless deployments)
3. Copy it — looks like `postgresql://postgres.xxxx:[password]@aws-x-xxxx.pooler.supabase.com:6543/postgres`

**Neon** or **Railway** work the same way — create a project, copy the connection string they give you.

You do **not** need to run any SQL yourself — the app creates its own tables automatically the first time it connects (see `lib/db.js`).

## Run it locally

```bash
cd phishing-detector
npm install
cp .env.example .env.local
# edit .env.local: paste your DATABASE_URL, set a JWT_SECRET
npm run dev
```

Open http://localhost:3000

## Run the tests

```bash
npm test
```

---

## Deploying to Vercel

1. Push this project to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/phishing-detector.git
   git push -u origin main
   ```
2. Go to vercel.com → Add New Project → import that GitHub repo
3. In the project's Environment Variables settings, add:
   - `DATABASE_URL` — your Supabase/Neon/Railway connection string
   - `JWT_SECRET` — any long random string (generate one with `openssl rand -base64 32`)
   - `VIRUSTOTAL_API_KEY` — optional, only if you got a free key
4. Click Deploy

That's it — Vercel builds and deploys automatically, and every future `git push` to `main` redeploys it. The database lives in Supabase/Neon, not on Vercel, so your data persists across deploys and server restarts (this is exactly why the Postgres swap was necessary — Vercel's own filesystem is read-only and wouldn't have worked with the old JSON-file database).

## Environment variables reference
```
DATABASE_URL=postgresql://...       # required
JWT_SECRET=some-long-random-string  # required in production
VIRUSTOTAL_API_KEY=                 # optional
```

## Project structure
```
app/
  api/            → backend routes (auth, scan, history, admin, reports)
  dashboard/      → scanner, history, reports pages (protected)
  admin/          → admin panel: analytics, users, logs, keywords, reports (protected, admin-only)
  login/ register/→ auth pages
components/       → Navbar, RiskBadge
lib/
  db.js           → Postgres connection pool + self-running schema migration
  store.js        → all SQL queries live here (data-access layer)
  auth.js         → password hashing, JWT, session helper
  detection.js    → the rule-based phishing detection logic (admin-extendable keywords)
  mlModel.js      → runs the trained Logistic Regression model in pure JS
  model.json      → trained model weights (exported from ml/train.py)
  ensemble.js     → combines rule engine + ML model into one score
  domainAge.js    → real WHOIS/RDAP domain-age lookup
  virustotal.js   → optional live VirusTotal blacklist check
  rateLimit.js    → in-memory sliding-window rate limiter
  useAuth.js      → client hook that protects pages
ml/               → offline Python training pipeline for the ML model (see ml/README.md)
tests/            → Vitest unit tests
.github/workflows/ci.yml → CI: test + lint + build on every push
```

## Going further
- **Rate limiting** here is in-memory, which only works correctly on a single running server
  process. Vercel serverless functions are ephemeral and can run as multiple instances, so in
  production this rate limiter resets more often than a real one would — fine for a portfolio
  project, but for real abuse protection swap to a shared store (Redis via `@upstash/ratelimit`,
  which has a free tier and is built for exactly this on serverless).
- Retrain the ML model with a bigger dataset (PhishTank + Tranco) for better accuracy — see `ml/README.md`.
- Add a connection pooler setting if you exceed free-tier connection limits under load (Supabase's
  pooled connection string on port 6543, already recommended above, handles this for you).
