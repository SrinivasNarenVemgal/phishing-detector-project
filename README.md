# PhishGuard — AI Phishing Detection Platform

🔗 **Live app:** https://phishing-dec-project.vercel.app/
📂 **Source code:** https://github.com/SrinivasNarenVemgal/phishing-detector-project

A full-stack cybersecurity web app that scans URLs and email/message content
for phishing risk in real time — combining a hand-written rule engine, a
trained machine learning model, a live domain-age lookup, and an optional
real threat-intelligence API into a single ensemble risk score.

---

## 1. What it does

- **URL Scanner** — paste any link, get a risk score (0–100), a risk level
  (LOW / MEDIUM / HIGH), and a plain-English list of exactly which signals
  triggered the score.
- **Email Analyzer** — paste suspicious email/message text, get flagged for
  urgency language, credential requests, and risky embedded links.
- **Personal Dashboard** — total scans, safe vs. suspicious breakdown.
- **Scan History** — every scan logged and browsable.
- **Threat Reports** — generate a written report from any past scan.
- **Admin Panel** — analytics, user management, full scan logs with filters,
  editable suspicious-keyword list, and visibility into every report
  generated across all users.
- **Auth & rate limiting** — JWT-based login/register, brute-force
  protection on login and registration endpoints.

---

## 2. Tech stack

| Layer | Technology | Why |
|---|---|---|
| Frontend + Backend | **Next.js 16** (App Router) | One project, one deploy, API routes double as the backend |
| Styling | **Tailwind CSS** + **Framer Motion** | Fast to build, smooth transitions on scan results |
| Database | **PostgreSQL** (via `pg`, hosted on Supabase) | Real relational DB; schema self-migrates on first run — no manual SQL needed |
| Auth | **JWT** in an HTTP-only cookie, **bcrypt** password hashing | Standard, secure session handling |
| ML | **Logistic Regression** trained in **Python (scikit-learn)** | Real trained model, not just an API call — see Section 4 |
| Detection APIs | **RDAP** (domain-age lookup), optional **VirusTotal API** | Live, real-world threat signals beyond static rules |
| Testing | **Vitest** — 18 unit tests | Detection engine, ML model, and rate limiter are all covered |
| CI/CD | **GitHub Actions** | Runs tests + lint + build automatically on every push |
| Hosting | **Vercel** (app) + **Supabase** (database) | Free tier, zero-downtime deploys, database persists independently of the app |

---

## 3. How detection works — the ensemble

Every URL scan runs through **four independent signals**, combined into one score:

1. **Rule engine** (`lib/detection.js`) — checks HTTPS usage, domain
   structure (hyphens, subdomain count, raw IP addresses), known
   link-shorteners, brand-impersonation patterns, and a keyword list that
   admins can extend from the Admin Panel.
2. **Machine Learning model** (`lib/mlModel.js` + `lib/model.json`) — a
   Logistic Regression model trained offline in Python on ~2,000 real
   labeled phishing/legitimate URLs. Achieves 83.6% accuracy, 84.5%
   precision, 82% recall on a held-out test set. The trained weights are
   exported to JSON and run natively in JavaScript — no Python server needed
   in production.
3. **Domain-age lookup** (`lib/domainAge.js`) — a real RDAP query checks how
   long ago a domain was registered. Domains registered within the last 30
   days are treated as a strong phishing signal — exactly how real
   anti-phishing systems weight this.
4. **VirusTotal check** (`lib/virustotal.js`, optional) — if an API key is
   configured, cross-references the URL against 70+ real antivirus/security
   engines.

The email analyzer runs a parallel rule-based pipeline checking for urgency
phrases, credential requests, generic greetings, and risky embedded links
(which get run back through the URL rule engine).

---

## 4. Real challenges faced (and how they were fixed)

This section is here on purpose — building this surfaced real engineering
problems, not just "follow the tutorial" steps.

### 4.1 The ML model learned something backwards
The first trained model hit 85% accuracy but flagged **wikipedia.org as 97%
likely to be phishing** — a false positive on one of the most legitimate
sites on the internet. Root cause: the training dataset recorded every
"legitimate" URL's protocol as `http`, regardless of its real protocol,
while the phishing set had a mix of `http` and `https`. The model learned
"HTTPS → phishing," which is exactly backwards.
**Fix:** removed that one poisoned feature, retrained (83.6% accuracy — an
honest trade-off), and added a permanent regression test against
well-known real domains (Google, Wikipedia, GitHub, Amazon) to catch this
class of bug before it ships again.

### 4.2 A scoring threshold didn't match the spec
The original project brief's own worked example — *"Your bank account will
be suspended. Verify immediately."* — is supposed to score HIGH risk. The
first version of the email analyzer scored it 54/100, just under the
55-point HIGH threshold.
**Fix:** an automated test caught this before it shipped; the threshold was
tuned to 50, which correctly classifies the spec's own example without
over-triggering on lower-risk messages.

### 4.3 Vercel's filesystem broke the original database
The app originally used a simple JSON-file database (`lowdb`) for local
development — zero setup, worked great locally. It completely failed once
deployed: **Vercel's serverless functions run on a read-only filesystem**,
so nothing written to a local file ever persisted between requests.
**Fix:** migrated the entire data layer to real PostgreSQL (hosted free on
Supabase), with a schema that self-creates on first connection — no manual
migration step required.

### 4.4 Git repeatedly committed `node_modules` and build artifacts
Multiple pushes failed because `node_modules` (thousands of files) and the
`.next` build cache (with files over 200MB) got committed, exceeding
GitHub's 100MB file-size limit. Root cause: a missing `.gitignore` — the ZIP
extraction tool had silently dropped dotfiles (`.gitignore`, `.env.local`)
during unzip, a known Windows Explorer quirk with files that have no name
before the leading dot.
**Fix:** recreated `.gitignore` directly in the editor, confirmed exclusion
with `git status` before committing, and reset Git history entirely once to
purge the oversized files already baked into old commits.

### 4.5 GitHub authentication used a stale, unrelated account
A push failed with `Permission denied to [unrelated account]` — Windows had
cached Git credentials for a completely different GitHub account from
something installed previously on the machine.
**Fix:** cleared the cached credential in Windows Credential Manager and
re-authenticated via GitHub's browser-based device login flow.

### 4.6 Vercel project name collisions
The first deployment name (`phishing-detector-project`) was already taken,
so Vercel silently appended a random suffix to the URL. Renamed the project
directly to a unique name to get a clean, permanent production URL.

---

## 5. Run it locally

```bash
git clone https://github.com/SrinivasNarenVemgal/phishing-detector-project.git
cd phishing-detector-project
npm install
cp .env.example .env.local
# edit .env.local — paste your DATABASE_URL and set a JWT_SECRET
npm run dev
```

Open http://localhost:3000

## 6. Run the tests

```bash
npm test
```

## 7. Environment variables

```
DATABASE_URL=postgresql://...       # required — free tier from Supabase/Neon/Railway
JWT_SECRET=some-long-random-string  # required
VIRUSTOTAL_API_KEY=                 # optional
```

## 8. Deploying your own copy

1. Push to your own GitHub repo
2. Create a free Postgres database on **Supabase** (Project Settings → Database → Connection String → use the **pooled connection**, port 6543)
3. Import the repo on **vercel.com** → Add New Project
4. Add the three environment variables above in Vercel's project settings
5. Deploy — every future push to `main` redeploys automatically

## 9. Project structure

```
app/
  api/            → backend routes (auth, scan, history, admin, reports)
  dashboard/      → scanner, history, reports pages (protected)
  admin/          → admin panel: analytics, users, logs, keywords, reports
  login/ register/→ auth pages
components/       → Navbar, RiskBadge
lib/
  db.js           → Postgres connection pool + self-running schema migration
  store.js        → all SQL queries (data-access layer)
  auth.js         → password hashing, JWT, session helper
  detection.js    → rule-based phishing detection logic
  mlModel.js      → runs the trained Logistic Regression model in pure JS
  model.json      → trained model weights
  ensemble.js     → combines rule engine + ML model into one score
  domainAge.js    → RDAP domain-age lookup
  virustotal.js   → optional live VirusTotal blacklist check
  rateLimit.js    → in-memory sliding-window rate limiter
ml/               → offline Python training pipeline (see ml/README.md)
tests/            → Vitest unit tests
.github/workflows/ci.yml → CI: test + lint + build on every push
```

## 10. Future enhancements

- Swap in-memory rate limiting for Redis (`@upstash/ratelimit`) to work correctly across multiple serverless instances
- Retrain the ML model on a larger dataset (PhishTank + Tranco)
- Browser extension for real-time link checking
- Real-time Gmail inbox scanning instead of copy-paste

---

🔗 **Live app:** https://phishing-dec-project.vercel.app/
📂 **Source:** https://github.com/SrinivasNarenVemgal/phishing-detector-project
