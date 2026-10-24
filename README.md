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

Open **http://localhost:5173**, not :3000. In dev, Express on :3000 only answers `/api`; Vite serves the page and passes every `/api` request on to Express. `concurrently` runs both, and Ctrl+C stops both.

For local development, `DATABASE_URL` points at a Postgres on your machine (e.g. `postgresql://localhost:5432/mayerfeld`) and `BETTER_AUTH_URL` is `http://localhost:5173`.

## Folder structure

The repo is an npm workspace with two packages, so one `npm install` at the root installs both.

- `client/`: the React app (Vite + Tailwind)
  - `src/components/`: one component per part of the page, plus one per extra view: `AuthForm` (`#signin`, `#signup`), `Cart` (`#cart`), `Checkout` (`#checkout`) and `MyBooks` (`#my-books`). `Reviews` and `Recommendations` are the sections under each book
  - `src/components/Header.jsx`: the top bar. `UserMenu` is the avatar dropdown, `MobileMenu` the drawer behind the hamburger button on phones
  - `src/components/Icons.jsx`: the small SVG icons (cart, menu, close, ...)
  - `src/api.js`: `getJson()` and `postJson()`, small `fetch` wrappers
  - `src/cart.js`: turns the saved cart into a list of books and a total
  - `src/auth.js`: the Better Auth client (`signIn`, `signUp`, `signOut`, `useSession`)
- `server/`: the Express API
  - `src/index.js`: starts Express, mounts auth and the API, serves `client/dist`
  - `src/api.js`: the book, review and event routes
  - `src/orders.js`: `/api/orders`, the pretend payment and order history
  - `src/session.js`: `currentUser()` and `requireUser`, which find the signed-in person from the session cookie
  - `src/auth.js`: Better Auth setup (email and password)
  - `src/db.js`: one `pg` connection pool, shared by everything
  - `db/schema.sql`: the `books`, `events`, `orders`, `order_items` and `reviews` tables
  - `db/migrate.js`: creates Better Auth's tables, then runs `schema.sql`
  - `db/seed.js`: copies the Week 2 arrays in `db/data/` into the database (books are updated in place, so orders and reviews survive a re-seed)

## The database

- `books`: one row per book. `id` is the slug used in links (`#book/slow-maps`). A book is a staff pick when `staff_pick_quote` is set.
- `events`: one row per event, sorted by `starts_at`.
- `orders`: one row per checkout: who paid, the total, the last 4 digits of the test card, and when.
- `order_items`: the books in each order, with the quantity and the price at the time.
- `reviews`: a rating (1 to 5) and text per person per book. `UNIQUE (user_id, book_id)` means writing again replaces your old review.
- `user`, `session`, `account`, `verification`: created and managed by Better Auth. `user` holds name and email, `account` holds the hashed password, `session` holds one row per signed-in browser.

## API

| Route | Returns |
| --- | --- |
| `GET /api/books` | every book, with its average `rating` and `reviewCount` |
| `GET /api/books/:id` | one book, or 404 |
| `GET /api/books/:id/reviews` | `{ canReview, reviews }`: the reviews, newest first, and whether the signed-in person may write one |
| `GET /api/books/:id/recommendations` | up to 4 books that this book's buyers also bought, most buyers first |
| `POST /api/books/:id/reviews` | `{ rating, text }`: add or replace your review. Signed in, and only for books you bought |
| `POST /api/orders` | `{ items, cardNumber }`: pay with a test card and save the order. Signed in |
| `GET /api/orders` | your orders, newest first, with their books. Signed in |
| `GET /api/events` | every event, soonest first |
| `/api/auth/*` | Better Auth: `sign-up/email`, `sign-in/email`, `sign-out`, `get-session` |

## The cart

The cart lives in the browser, not the database. `App` keeps it in state as `{ bookId: quantity }` and saves it to `localStorage` whenever it changes, so it survives a refresh. The header badge, the Add buttons and the `#cart` page all read the same state. After a successful payment, `Checkout` empties it.

## Payment (a demo)

No real payment provider is involved and no money moves. `#checkout` sends the cart's book ids and quantities, plus the card number, to `POST /api/orders`. The server:

1. Accepts only two test cards: `4242 4242 4242 4242` goes through and `4000 0000 0000 0002` is declined. Anything else is refused, so nobody can enter a real card.
2. Looks the prices up in the database itself, so the browser can't change what it pays.
3. Waits 1.5 seconds, like a real payment would.
4. Saves the order and its books in one transaction (`BEGIN` ... `COMMIT`): either all of it is saved or none of it. Only the card's last 4 digits are kept.

The checkout page has buttons that fill in either test card.

## Reviews

Only people who bought a book can review it: the server checks `order_items` before saving. Each book page loads its reviews from `GET /api/books/:id/reviews`, and buyers get a form with the `StarRating` component. My books (`#my-books`, in the account menu) lists every order with a "Write a review" link for each book, which opens `#book/<id>/reviews`.

## Recommendations

Under each book, "Readers who bought this also bought" comes from `GET /api/books/:id/recommendations`. The query in `server/src/api.js` works in three steps (a `WITH` query):

1. `buyers`: everyone who has ordered this book.
2. `also_bought`: the other books those people ordered, and how many of them ordered each one.
3. Those books in full, with their ratings, the most-shared first, at most 4.

When nobody has bought the book yet, the list is empty, and the page shows "More in Fiction" (or Nonfiction) from the books it already has instead.

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
