# MayerfeldBooks

Course project for a bookstore site, built up over weekly assignments. The student presents and explains this code at assessment, so every change must stay simple enough to walk through line by line.

- Assignment 1: plain HTML/CSS
- Assignment 2: Vite + React + Tailwind (hardcoded data)
- Assignment 3: Express API, Postgres, Better Auth, deployed on Railway

`README.md` documents the folder structure, the schema, the API and how login works. Keep it up to date when any of those change.

## Rules from the course

- **No TypeScript**, anywhere in the repo. That includes config files (it's why there is no `.railway/railway.ts`).
- Keep working in this project; don't restructure into a framework the student hasn't learned.
- Secrets never go in git. `server/.env` is ignored; `server/.env.example` lists the names only.

## Commands

```bash
npm install                  # root: installs both workspaces
npm run dev                  # concurrently: Express on :3000 (API only) + Vite on :5173 (open this)
npm run lint                 # oxlint on the client
npm run build                # builds client/dist
npm run migrate -w server    # creates all tables (safe to re-run)
npm run seed -w server       # upserts the Week 2 books, replaces events (orders/reviews survive)
```

There are no automated tests. Check a change with lint + build, then by running the server and hitting the API (curl) or the page.

## Layout

npm workspaces: `client/` (React) and `server/` (Express, ESM, plain JS). One `package-lock.json` at the root.

- `server/src/index.js`: mounts Better Auth, then `express.json()`, then `/api`, then serves `client/dist`
- `server/src/db.js`: the single `pg` pool everything shares
- `server/src/auth.js`: Better Auth config (email + password)
- `server/src/api.js`: `/api/books`, `/api/books/:id`, `/api/books/:id/reviews`, `/api/events`
- `server/src/orders.js`: `/api/orders` (simulated test-card payment, order history)
- `server/src/session.js`: `currentUser(req)` and the `requireUser` middleware (Better Auth `getSession`)
- `server/db/`: `schema.sql`, `migrate.js`, `seed.js`, and `data/` (the Week 2 arrays, used only by the seed)
- `client/src/api.js`: `getJson()`, `postJson()`; `client/src/auth.js`: Better Auth React client
- Cart is client-only (`localStorage`, state in `App.jsx`); orders and reviews are in Postgres

## Conventions

- Plain SQL with `pg` and `$1` placeholders. No ORM.
- Database columns are snake_case; the API returns the camelCase shape the React components already used (see `toBook` in `server/src/api.js`).
- Hash routing in `App.jsx`, no router library. The hash splits at `/` into page/param/anchor: `#book/<id>`, `#book/<id>/reviews`, `#signin/checkout` (sign in, then go to `#checkout`), `#cart`, `#checkout`, `#my-books`.
- Comments explain *why* in plain English for a student reader; match the density of the existing files.
- Commits: small, one-line messages, one logical step each.

## Gotchas we already hit

- Better Auth must be mounted **before** `express.json()`, or it can't read the request body.
- Express 5 wildcard syntax: `app.all('/api/auth/{*any}', ...)`.
- `getMigrations` is imported from `better-auth/db/migration` (not `better-auth/db`) in v1.7.
- Postgres `numeric` comes back as a string: convert `price` with `Number()`.
- `timestamp` → JS `Date` shifts by the local timezone; events use `to_char(...)` in SQL instead.
- `pool.on('error')` is required: Neon/Railway close idle connections and an unhandled pool error crashes the process.
- Better Auth throws at startup in production without `BETTER_AUTH_SECRET`. `db.js` and `auth.js` check the three env vars and name the missing one.

## Deployment (Railway)

Project `tewshi`, environment `production`, workspace "klerkk LLC".

- `bookstore-assessment`: the app, one service for API + built React app (same origin, so cookies need no CORS). Deploys on push to `main`.
- `bookstore-pgdb`: Postgres. Private only, no TCP proxy, so it can't be reached from a laptop.

Build/start/pre-deploy commands live in the **service settings on Railway**, not in a repo file:

| Setting | Value |
| --- | --- |
| Build | `npm run build` |
| Pre-deploy | `npm run migrate -w server` |
| Start | `npm start` |

Variables on `bookstore-assessment`: `DATABASE_URL=${{bookstore-pgdb.DATABASE_URL}}`, `BETTER_AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}`, `BETTER_AUTH_SECRET`.

Live URL: https://mayerfeld-bookstore-assessment.up.railway.app

Seeding production is a manual step the student runs themselves (Railway service shell, or `railway ssh --service bookstore-assessment -- npm run seed -w server`). Don't change Railway settings, variables, networking or deploys without asking first; give the command instead.

## History of decisions

- **One Railway service instead of Railway + Vercel**: Express serves `client/dist`, so the site and API share a URL and the session cookie is same-origin.
- **Better Auth** owns the `user`, `session`, `account` and `verification` tables; we only write `books` and `events` in `schema.sql`.
- **`railway.json` removed (Oct 2026)**: Railway deprecated config-as-code and its replacement is TypeScript-only (or Python/Go), which breaks the no-TypeScript rule. Settings moved to the dashboard.
- **Local dev uses a local Postgres** installed on the student's Mac, migrated and seeded separately from production. The Railway database stays private.
- **`npm run dev` uses `concurrently`**: the old `a & b` script left Express running after Ctrl+C, so the next run hit "port in use".
