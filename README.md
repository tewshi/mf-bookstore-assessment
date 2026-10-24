# MayerfeldBooks

An independent bookstore site: fiction, nonfiction, staff picks and an events list.
Assignment 1 was plain HTML/CSS; Assignment 2 rebuilt it with Vite, React and Tailwind.
Assignment 3 adds an Express API, a Postgres database and real login.

## Run it

```bash
npm install
cp server/.env.example server/.env   # then fill in the values
npm run migrate -w server            # create the tables
npm run seed -w server               # fill books and events
npm run dev                          # Express on :3000, Vite on :5173
```

Open http://localhost:5173. Vite passes every `/api` request on to Express.

## Folder structure

The repo is an npm workspace with two packages, so one `npm install` at the root installs both.

- `client/`: the React app (Vite + Tailwind)
  - `src/components/`: one component per part of the page, plus `AuthForm` for `#signin` and `#signup`
  - `src/api.js`: `getJson()`, a small `fetch` wrapper
  - `src/auth.js`: the Better Auth client (`signIn`, `signUp`, `signOut`, `useSession`)
- `server/`: the Express API
  - `src/index.js`: starts Express, mounts auth and the API, serves `client/dist`
  - `src/api.js`: the `/api/books` and `/api/events` routes
  - `src/auth.js`: Better Auth setup (email and password)
  - `src/db.js`: one `pg` connection pool, shared by everything
  - `db/schema.sql`: the `books` and `events` tables
  - `db/migrate.js`: creates Better Auth's tables, then runs `schema.sql`
  - `db/seed.js`: copies the Week 2 arrays in `db/data/` into the database

## The database

- `books`: one row per book. `id` is the slug used in links (`#book/slow-maps`). A book is a staff pick when `staff_pick_quote` is set.
- `events`: one row per event, sorted by `starts_at`.
- `user`, `session`, `account`, `verification`: created and managed by Better Auth. `user` holds name and email, `account` holds the hashed password, `session` holds one row per signed-in browser.

## API

| Route | Returns |
| --- | --- |
| `GET /api/books` | every book |
| `GET /api/books/:id` | one book, or 404 |
| `GET /api/events` | every event, soonest first |
| `/api/auth/*` | Better Auth: `sign-up/email`, `sign-in/email`, `sign-out`, `get-session` |

## How login works

1. `AuthForm` calls `authClient.signUp.email()` or `authClient.signIn.email()`.
2. Better Auth on the server checks the password, adds a row to `session` and sends back a cookie holding the session token, signed with `BETTER_AUTH_SECRET`.
3. The browser sends that cookie with every request. `useSession()` in `Header` asks `/api/auth/get-session` who it belongs to, so after a refresh you are still signed in.
4. Sign out deletes the session row and the cookie.

## Secrets

`server/.env` holds `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. It is listed in `.gitignore` and never committed; `server/.env.example` shows the names. In production the same values are set as Railway variables.

## Deployment

One Railway service runs the whole app from the repo root. Its commands are set in the service's Settings on Railway:

- Build: `npm run build` builds the React app into `client/dist`
- Pre-deploy: `npm run migrate -w server`
- Start: `npm start` runs Express, which serves both `/api` and the built React app

The Postgres database is a second Railway service, `bookstore-pgdb`. The app's `DATABASE_URL` variable is a reference to it, `${{bookstore-pgdb.DATABASE_URL}}`, so Railway fills in the address itself.

The site and the API share one URL, so the session cookie needs no CORS setup.
