# MayerfeldBooks

Course project for a bookstore site, built up over weekly assignments. The student presents and explains this code at assessment, so every change must stay simple enough to walk through line by line.

- Assignment 1: plain HTML/CSS
- Assignment 2: Vite + React + Tailwind (hardcoded data)
- Assignment 3: Express API, Postgres, Better Auth, deployed on Railway
- Assignment 4: Stripe Checkout (test mode), webhook marks orders paid; admin refunds; in-app notifications; emails (receipt, refund, password reset) via Mailtrap

`README.md` documents the folder structure, the schema, the API and how login works. Keep it up to date when any of those change.

## Rules from the course

- **No TypeScript**, anywhere in the repo. That includes config files (it's why there is no `.railway/railway.ts`).
- Keep working in this project; don't restructure into a framework the student hasn't learned.
- Secrets never go in git. `server/.env` is ignored; `server/.env.example` lists the names only.

## Commands

```bash
npm install                  # root: installs both workspaces
npm run dev                  # node dev.js: Express on :3000 (API only) + Vite on :5173 (open this)
stripe listen --all-snapshot --forward-to localhost:3000/api/webhooks/stripe   # needed locally for payments to turn 'paid' (new CLIs refuse to start without an events flag)
npm run lint                 # oxlint on the client
npm test                     # Vitest: server/test (unit) + client/test (unit + smoke); -w server or -w client for one side
npm run build                # builds client/dist
npm run migrate -w server    # creates all tables (safe to re-run)
npm run seed -w server       # upserts the 24 books and 7 events (orders, reviews, reservations survive)
npm run make-admin -w server -- you@example.com   # role = 'admin' (--undo to reverse)
make dev                     # node dev.js --stripe: the two servers above + make stripe, one terminal
make stripe | build | start | lint | test   # root Makefile; make stripe waits up to 10s for the running API's port (pgrep + lsof), else PORT in server/.env, else 3000
```

Check a change with `npm test` + lint + build, then by running the server and hitting the API (curl) or the page. Tests need no database, Stripe, SMTP or `.env`: `vi.mock` swaps `lib/db.js`, `lib/stripe.js`, `lib/mail.js` etc. for `vi.fn()` fakes, and the module under test is loaded after with `await import()`. Client tests run in jsdom (settings under `test` in `vite.config.js`; `test/setup.js` stubs `IntersectionObserver`, `EventSource`, scrolling). Smoke tests render `<App />` per address with a fake `fetch` and `vi.mock('../src/lib/auth')`; a new page should get a line there. When adding a test, break the code once to see it fail.

## Layout

npm workspaces: `client/` (React) and `server/` (Express, ESM, plain JS). No lockfile: the instructor asked for none, so `.npmrc` has `package-lock=false` and `.gitignore` lists `package-lock.json`. Don't add one back.

- `server/src/index.js`: mounts Better Auth and the Stripe webhook (raw body), then `express.json()`, then `/api`, then serves `client/dist`, and last an error handler that answers `{ error }` as JSON (500, or the error's own status such as 400 for broken JSON)
- `server/src/lib/`: setup shared by the routes. `db.js` (the single `pg` pool), `auth.js` (Better Auth config, email + password), `session.js` (`currentUser(req)`, `requireUser`, `requireAdmin` via Better Auth `getSession`), `stripe.js` (the client), `mail.js` (nodemailer transport + `sendEmail()`, logs instead of sending without SMTP vars), `emails.js` (`sendReceipt`, `sendRefundEmail`, `sendPasswordReset`; text + inline-styled HTML, `escapeHtml` on names/titles), `notifications.js` (`sendNotification(userIds, text, link)`, `sendToAdmins`, `sendBackInStock`: rows in `notifications`, then a live `notifications` topic to those people), `live.js` (SSE: open `/api/live` tabs with `userId`/`isAdmin`, and `notifyEveryone` / `notifyUser` / `notifyAdmins` / `notifyUserAndAdmins`; the route is `routes/live.js`)
- `server/src/routes/api.js`: the `/api` router: health check, then mounts every router in `routes/`
- `server/src/routes/books.js`: `/api/books` (full list, or a page with `?page=&q=&section=&sort=`), `/:id`, `/:id/recommendations`; `reviews.js`: `/api/books/:id/reviews` (`Router({ mergeParams: true })` to read `:id`)
- `server/src/routes/orders.js`: `/api/orders` (pending order + stock decrement + Stripe Checkout Session in one transaction, paid history, `/:id` with status)
- `server/src/routes/webhook.js`: `/api/webhooks/stripe`, where every status change after checkout lives: `paid`, `cancelled` + stock back on failed/expired, and `refunded` + stock back (`refundOrder`, exported for the admin Refund button; also run by `charge.refunded` for dashboard refunds, found via `checkout.sessions.list({ payment_intent })`)
- `server/src/routes/notifications.js` (the bell: list, mark read), `routes/wishlist.js`, `routes/events.js` (seat sign-up), `routes/admin.js` (`requireAdmin`, `GET /counts` for the tab badges, then mounts `routes/admin/orders.js`, `books.js`, `events.js`, `users.js` (read only), one per admin tab)
- Better Auth `user.additionalFields.role` (`input: false`); `server/db/make-admin.js` sets it
- `server/db/`: `schema.sql`, `migrate.js`, `seed.js`, and `data/` (the Week 2 arrays, used only by the seed)
- `client/src/App.jsx`: shared state + path routing; `client/src/pages/`: one file per page it renders (`Home`, `BookDetails`, `SignIn`, `ForgotPassword`, `ResetPassword`, `Cart`, `Checkout`, `Paid`, `Orders`, `Wishlist`, `Account`, `Receipt`, `NotFound`, `admin/`). `pageTitles` in App.jsx lists the pages and their tab titles; any other path, or an unknown book id, renders `NotFound`
- `client/src/components/`: `layout/` (Header, menus, NotificationBell, Footer, `accountLinks.js`), `books/` (BookCard, BookGrid, StarRating, Reviews, Recommendations), `home/` (Hero, StaffPicks, Events), `ui/` (Icons, Avatar, Toast, Reveal, and Select, SearchBox, Pagination, RefreshButton for every list)
- `client/src/lib/`: plain JS. `api.js` (`getJson()`, `sendJson()`, `postJson()`), `auth.js` (Better Auth React client), `cart.js`, `usePages.js` (client-side paging: Orders 10, Wishlist 12, admin lists 10, staff picks and events 6; the book grid's 12 is `perPage` in `routes/books.js`; `Pagination` renders nothing for one page), `resizeImage.js`, `navigate.js` (`navigate()` + `handleLinkClick`), `useLive.js` (`useLive(topic, load)`: one shared `EventSource` per tab)
- Cart and theme choice are client-only (`localStorage`); orders, reviews, wishlist, stock and reservations are in Postgres
- Dark mode: `.dark` overrides the `--color-*` tokens in `index.css`; use `text-on-accent` (not `text-white`) on `bg-accent`

## Conventions

- Plain SQL with `pg` and `$1` placeholders. No ORM.
- Database columns are snake_case; the API returns the camelCase shape the React components already used (see `toBook` in `server/src/routes/books.js`).
- Path routing in `App.jsx`, no router library: `history.pushState` via `navigate()` in `lib/navigate.js`, and `App` listens for `popstate`. A document click listener (`handleLinkClick`) sends our own `<a href="/...">` links through `navigate()`, so plain `<a>` tags are fine. The path splits at `/` into page/param: `/book/<id>`, `/signin/checkout` (sign in, then go to `/checkout`), `/forgot-password`, `/reset-password?token=` (Better Auth's email link redirects here; the only page that reads `location.search`), `/cart`, `/checkout`, `/checkout/<id>` (Buy now reuses order <id> if the cart still matches; nothing links here since cancel_url became `/orders`), `/paid/<id>` (Stripe's success_url), `/orders`, `/wishlist`, `/account`, `/order/<id>`, `/admin/<tab>`. `#` is only for scrolling to a section: `/#books`, `/#staff-picks`, `/#events`, `/book/<id>#reviews`.
- Comments explain *why* in plain English for a student reader; match the density of the existing files.
- Commits: small, one-line messages, one logical step each.

## Gotchas we already hit

- Better Auth must be mounted **before** `express.json()`, or it can't read the request body.
- The Stripe webhook also goes before `express.json()`, with `express.raw()`: the signature check needs the exact bytes.
- The `whsec_` from `stripe listen` (local `.env`) differs from the dashboard endpoint's (Railway). The env var is `STRIPE_WEBHOOK_SECRET_KEY` (the student's name for it).
- Reviews, recommendations and admin totals count only `status = 'paid'` (refunded orders drop out). Statuses: pending, paid, cancelled, refunded; changing the list means dropping and re-adding `orders_status_check` in `schema.sql`. Old demo orders have no `stripe_session_id`, so they can't be refunded. Orders (`/orders`) lists paid and pending orders (pending: "Pending payment" + Pay now, which calls `POST /api/orders/:id/pay` to reopen the still-open Stripe session; no receipt or review links).
- Express 5 wildcard syntax: `app.all('/api/auth/{*any}', ...)`.
- `getMigrations` is imported from `better-auth/db/migration` (not `better-auth/db`) in v1.7.
- Postgres `numeric` comes back as a string: convert `price` with `Number()`.
- `timestamp` → JS `Date` shifts by the local timezone; events use `to_char(...)` in SQL instead.
- Better Auth rejects cookie-authenticated POSTs without an `Origin` header (CSRF check): add `-H 'Origin: http://localhost:5173'` when testing with curl.
- In zsh, an unquoted `$VAR` holding several curl flags is NOT split into words; spell flags out or use a function.
- oxlint's React rules flag `Date.now()` in render scope, `setState` straight inside an effect, and writing `window.location` in a component; use a ref, derive the value during render, or render a link instead.
- In production, Express answers any non-`/api` GET with `client/dist/index.html` (after `express.static`), or a refresh on `/orders` would 404. Vite does this by itself in dev.
- Live updates (SSE): a route that changes data must notify after the write (after `COMMIT` in a transaction), and a list that shows it needs `useLive('<topic>', load)`. Pick the audience: `notifyEveryone` for public data (books, events, reviews), `notifyUser` for one person's own (wishlist), `notifyUserAndAdmins` for orders, `notifyAdmins` for users. Only the topic is sent, never data. The tab's identity is fixed at connect, so `App` calls `liveSignedInAs(userId)` to reconnect on sign-in/out. `EventSource` gives up for good after an HTTP error (Vite/Railway while Express restarts), and Vite's proxy can keep a dead stream open, so `useLive.js` reconnects itself (5s after CLOSED, or after 60s without the 25s `ping`). Chrome's network panel may not list the refetches; `performance.getEntriesByType('resource')` does.
- Mailtrap's sandbox uses STARTTLS on every port, 465 included: nodemailer's default (`secure: true` on 465) fails with `SSL ... wrong version number`. `lib/mail.js` sets `secure` only when `SMTP_SECURE=true`, plus `requireTLS`.
- Emails and notifications never fail the action that caused them: `sendEmail` logs errors, and the webhook doesn't await emails (Stripe waits for its answer). Better Auth's `sendResetPassword` isn't awaited either (timing would reveal which emails have accounts).
- `pool.on('error')` is required: Neon/Railway close idle connections and an unhandled pool error crashes the process.
- Better Auth throws at startup in production without `BETTER_AUTH_SECRET`. `lib/db.js` and `lib/auth.js` check the three env vars and name the missing one.

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

Variables on `bookstore-assessment`: `DATABASE_URL=${{bookstore-pgdb.DATABASE_URL}}`, `BETTER_AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_KEY`, and for email `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (Mailtrap). `lib/stripe.js` throws at startup if either Stripe one is missing; missing SMTP vars only log a warning (emails are then logged, not sent).

Live URL: https://mayerfeld-bookstore-assessment.up.railway.app

Seeding production is a manual step the student runs themselves (Railway service shell, or `railway ssh --service bookstore-assessment -- npm run seed -w server`). Don't change Railway settings, variables, networking or deploys without asking first; give the command instead.

## History of decisions

- **One Railway service instead of Railway + Vercel**: Express serves `client/dist`, so the site and API share a URL and the session cookie is same-origin.
- **Better Auth** owns the `user`, `session`, `account` and `verification` tables; we only write `books` and `events` in `schema.sql`.
- **`railway.json` removed (Oct 2026)**: Railway deprecated config-as-code and its replacement is TypeScript-only (or Python/Go), which breaks the no-TypeScript rule. Settings moved to the dashboard.
- **Local dev uses a local Postgres** installed on the student's Mac, migrated and seeded separately from production. The Railway database stays private.
- **`npm run dev` runs `dev.js`**: the old `a & b` script left Express running after Ctrl+C, so the next run hit "port in use". `concurrently` fixed that, then was replaced (Oct 2026) by `dev.js`, which uses Node's `child_process` so the project needs no extra package. It stops both servers on Ctrl+C, on `kill`, or when either one exits. `node --watch` keeps the API process alive after an app crash (it waits for a file change), the same as before.
- **No `package-lock.json` (Oct 2026)**: the instructor asked for it to be removed. Railway then installs with `npm install` instead of `npm ci`, so versions float within the `^` ranges in `package.json`.
- **Folders by kind (Oct 2026)**: `server/src` split into `lib/` (setup) and `routes/` (one router per URL prefix, admin one per tab); `client/src` into `pages/` (what App.jsx routes to), `components/{layout,books,home,ui}` and `lib/` (plain JS). Files were moved with `git mv`, so `git log --follow` still shows their history.
- **Real page URLs instead of `#` routes (Oct 2026)**: the student asked for `#` to be kept for in-page sections only. Pages moved from `#cart` to `/cart` etc. with `history.pushState`, still with no router library. Old `#...` links (bookmarks, Stripe sessions made before the change) land on the home page.
