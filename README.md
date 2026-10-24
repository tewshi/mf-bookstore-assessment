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
npm run make-admin -w server -- you@example.com   # optional: make your account an admin
```

Open **http://localhost:5173**, not :3000. In dev, Express on :3000 only answers `/api`; Vite serves the page and passes every `/api` request on to Express. `concurrently` runs both, and Ctrl+C stops both.

For local development, `DATABASE_URL` points at a Postgres on your machine (e.g. `postgresql://localhost:5432/mayerfeld`) and `BETTER_AUTH_URL` is `http://localhost:5173`.

## Folder structure

The repo is an npm workspace with two packages, so one `npm install` at the root installs both.

- `client/`: the React app (Vite + Tailwind)
  - `src/components/`: one component per part of the page, plus one per extra view: `AuthForm` (`#signin`, `#signup`), `Cart` (`#cart`), `Checkout` (`#checkout`), `MyBooks` (`#my-books`), `Saved` (`#saved`), `Account` (`#account`) and `Receipt` (`#order/<id>`). `Reviews` and `Recommendations` are the sections under each book
  - `src/components/admin/`: the `#admin` page and its Orders, Books and Events tabs
  - `src/components/Header.jsx`: the top bar. `UserMenu` is the avatar dropdown, `MobileMenu` the drawer behind the hamburger button on phones, `ThemeToggle` the light/dark button
  - `src/components/BookGrid.jsx`: search, sort, section filter and pages, all asked of the API
  - `src/components/Toast.jsx`: the short message at the bottom ("Added to your cart")
  - `src/components/Icons.jsx`: the small SVG icons (cart, menu, close, ...)
  - `src/api.js`: `getJson()`, `sendJson()` and `postJson()`, small `fetch` wrappers
  - `src/cart.js`: turns the saved cart into a list of books and a total
  - `src/accountLinks.js`: the links in the account menu (Admin only for admins)
  - `src/resizeImage.js`: shrinks a profile picture to 160x160 before it is saved
  - `src/auth.js`: the Better Auth client (`signIn`, `signUp`, `signOut`, `useSession`)
- `server/`: the Express API
  - `src/index.js`: starts Express, mounts auth and the API, serves `client/dist`
  - `src/api.js`: the book, review and recommendation routes, and where the other routers are mounted
  - `src/orders.js`: `/api/orders`, the pretend payment, order history and receipts
  - `src/wishlist.js`: `/api/wishlist`, the saved books
  - `src/events.js`: `/api/events` and seat reservations
  - `src/admin.js`: `/api/admin`, for admins only
  - `src/session.js`: `currentUser()`, `requireUser` and `requireAdmin`, which find the signed-in person from the session cookie
  - `src/auth.js`: Better Auth setup (email and password, plus a `role` field on users)
  - `src/db.js`: one `pg` connection pool, shared by everything
  - `db/schema.sql`: the shop's tables (see below)
  - `db/migrate.js`: creates Better Auth's tables, then runs `schema.sql`
  - `db/seed.js`: copies the arrays in `db/data/` (24 books, 7 events) into the database. Rows are updated in place, so orders, reviews and reservations survive a re-seed
  - `db/make-admin.js`: makes an account an admin (`--undo` to reverse)

## The database

- `books`: one row per book. `id` is the slug used in links (`#book/slow-maps`). A book is a staff pick when `staff_pick_quote` is set. `stock` is how many copies are on the shelf.
- `events`: one row per event, sorted by `starts_at`. `seats` is how many people fit.
- `event_signups`: who reserved a seat at which event (one per person per event).
- `wishlist`: the books each person saved for later (the hearts).
- `orders`: one row per checkout: who paid, the total, the last 4 digits of the test card, and when.
- `order_items`: the books in each order, with the quantity and the price at the time.
- `reviews`: a rating (1 to 5) and text per person per book. `UNIQUE (user_id, book_id)` means writing again replaces your old review.
- `user`, `session`, `account`, `verification`: created and managed by Better Auth. `user` holds name, email, the profile picture (`image`) and `role` (`customer` or `admin`); `account` holds the hashed password; `session` holds one row per signed-in browser.

`stock` and `seats` were added after their tables already existed, so `schema.sql` adds them with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which is safe to run again.

## API

| Route | Returns |
| --- | --- |
| `GET /api/books` | every book, with its average `rating`, `reviewCount` and `stock` |
| `GET /api/books?page=2&q=river&section=Fiction&sort=price-low` | one page (8 books) of the matching books: `{ books, total, page, perPage, pageCount }`. `q` searches title, author and ISBN; `sort` is `featured`, `price-low`, `price-high`, `rating` or `newest` |
| `GET /api/books/:id` | one book, or 404 |
| `GET /api/books/:id/reviews` | `{ canReview, reviews }`: the reviews, newest first, and whether the signed-in person may write one |
| `GET /api/books/:id/recommendations` | up to 4 books that this book's buyers also bought, most buyers first |
| `POST /api/books/:id/reviews` | `{ rating, text }`: add or replace your review. Signed in, and only for books you bought |
| `POST /api/orders` | `{ items, cardNumber }`: pay with a test card and save the order. Signed in |
| `GET /api/orders` | your orders, newest first, with their books. Signed in |
| `GET /api/orders/:id` | one of your orders, for the receipt. Signed in |
| `GET /api/wishlist` | the ids of the books you saved. Signed in |
| `PUT /api/wishlist/:bookId`, `DELETE /api/wishlist/:bookId` | save or un-save a book. Signed in |
| `GET /api/events` | upcoming events, soonest first, with `seatsLeft` and whether you are `going` |
| `POST /api/events/:id/signup`, `DELETE /api/events/:id/signup` | reserve or give back a seat. Signed in |
| `GET /api/admin/orders` | every order, with the customer. Admins |
| `POST /api/admin/books`, `PUT` / `DELETE /api/admin/books/:id` | add, edit or delete a book (books that were ordered can't be deleted). Admins |
| `GET /api/admin/events`, `POST /api/admin/events`, `PUT` / `DELETE /api/admin/events/:id` | all events, past ones too; add, edit or delete one. Admins |
| `/api/auth/*` | Better Auth: `sign-up/email`, `sign-in/email`, `sign-out`, `get-session` |

## The cart

The cart lives in the browser, not the database. `App` keeps it in state as `{ bookId: quantity }` and saves it to `localStorage` whenever it changes, so it survives a refresh. The header badge, the Add buttons and the `#cart` page all read the same state. After a successful payment, `Checkout` empties it.

## Payment (a demo)

No real payment provider is involved and no money moves. `#checkout` sends the cart's book ids and quantities, plus the card number, to `POST /api/orders`. The server:

1. Accepts only two test cards: `4242 4242 4242 4242` goes through and `4000 0000 0000 0002` is declined. Anything else is refused, so nobody can enter a real card.
2. Looks the prices up in the database itself, so the browser can't change what it pays.
3. Waits 1.5 seconds, like a real payment would.
4. Saves the order in one transaction (`BEGIN` ... `COMMIT`): it takes the books off the shelf (`UPDATE books SET stock = stock - n WHERE ... AND stock >= n`), then saves the order and its books. If any book ran out in the meantime, `ROLLBACK` undoes everything. Only the card's last 4 digits are kept.

The checkout page has buttons that fill in either test card. Afterwards there is a printable receipt at `#order/<id>`.

## Searching and pages

The book grid asks the API for one page at a time: `GET /api/books?page=1&q=...&section=...&sort=...`. The server filters with `ILIKE` (title, author) and compares ISBNs without their dashes, counts the matches for the page numbers, then fetches just that page with `LIMIT 8 OFFSET ...`. `ORDER BY` can't use a `$1` placeholder, so the sort name is looked up in a fixed list (`sortOrders`) and anything else falls back to the default, so no text from the request ever ends up in the SQL. While you type, the grid waits until you pause for 300 ms before searching.

## Reviews

Only people who bought a book can review it: the server checks `order_items` before saving. Each book page loads its reviews from `GET /api/books/:id/reviews`, and buyers get a form with the `StarRating` component. My books (`#my-books`, in the account menu) lists every order with a "Write a review" link for each book, which opens `#book/<id>/reviews`.

## Recommendations

Under each book, "Readers who bought this also bought" comes from `GET /api/books/:id/recommendations`. The query in `server/src/api.js` works in three steps (a `WITH` query):

1. `buyers`: everyone who has ordered this book.
2. `also_bought`: the other books those people ordered, and how many of them ordered each one.
3. Those books in full, with their ratings, the most-shared first, at most 4.

When nobody has bought the book yet, the list is empty, and the page shows "More in Fiction" (or Nonfiction) from the books it already has instead.

## Admin

Admins see an Admin link in the account menu. `#admin` has three tabs: every order (with totals), the books (add, edit, change stock, delete unordered ones) and the events (add, edit, delete). Every `/api/admin` route checks `role === 'admin'` on the server with `requireAdmin`; hiding the link is only for looks.

`role` is an extra field on Better Auth's `user` table (`additionalFields` in `server/src/auth.js`) with `input: false`, so nobody can give themselves a role when signing up. To make someone an admin:

```bash
npm run make-admin -w server -- you@example.com          # locally
npm run make-admin -w server -- you@example.com --undo   # back to customer
```

They need to refresh the page to see the link.

## Dark mode

All the colours are CSS variables in `client/src/index.css`. The `.dark` block gives them night-time values, so components didn't need changing. Dark is the default: a small script in `index.html` adds the `dark` class to `<html>` before the page is drawn, unless the visitor chose light before, and `ThemeToggle` switches it and saves the choice in `localStorage`. Buttons use `text-on-accent` rather than `text-white`, because in dark mode the accent is light and needs dark text.

## How login works

1. `AuthForm` calls `authClient.signUp.email()` or `authClient.signIn.email()`.
2. Better Auth on the server checks the password, adds a row to `session` and sends back a cookie holding the session token, signed with `BETTER_AUTH_SECRET`.
3. The browser sends that cookie with every request. `useSession()` in `Header` asks `/api/auth/get-session` who it belongs to, so after a refresh you are still signed in.
4. Sign out deletes the session row and the cookie.

On `#account` people can change their name and password, and upload a picture. The picture is shrunk to 160x160 in the browser and saved as text (a data URL) in the user's `image` field, so no file storage is needed.

## Secrets

`server/.env` holds `DATABASE_URL`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. It is listed in `.gitignore` and never committed; `server/.env.example` shows the names. In production the same values are set as Railway variables.

## Deployment

One Railway service runs the whole app from the repo root. Its commands are set in the service's Settings on Railway:

- Build: `npm run build` builds the React app into `client/dist`
- Pre-deploy: `npm run migrate -w server`
- Start: `npm start` runs Express, which serves both `/api` and the built React app

The Postgres database is a second Railway service, `bookstore-pgdb`. The app's `DATABASE_URL` variable is a reference to it, `${{bookstore-pgdb.DATABASE_URL}}`, so Railway fills in the address itself.

The site and the API share one URL, so the session cookie needs no CORS setup.
