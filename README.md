# MayerfeldBooks

An independent bookstore site: fiction, nonfiction, staff picks and an events list.
Assignment 1 was plain HTML/CSS; Assignment 2 rebuilt it with Vite, React and Tailwind.
Assignment 3 adds an Express API, a Postgres database and real login.
Assignment 4 takes real payments with Stripe Checkout, in test mode.

## Run it

```bash
npm install
cp server/.env.example server/.env   # then fill in the values
npm run migrate -w server            # create the tables
npm run seed -w server               # fill books and events
npm run dev                          # Express on :3000, Vite on :5173
stripe listen --forward-to localhost:3000/api/webhooks/stripe   # in a second terminal, for payments
npm run make-admin -w server -- you@example.com   # optional: make your account an admin
```

Open **http://localhost:5173**, not :3000. In dev, Express on :3000 only answers `/api`; Vite serves the page and passes every `/api` request on to Express. `dev.js` (in the repo root) starts both with Node's built-in `child_process`, so no extra package is needed; Ctrl+C stops both, and if one of them stops on its own, so does the other.

For local development, `DATABASE_URL` points at a Postgres on your machine (e.g. `postgresql://localhost:5432/mayerfeld`) and `BETTER_AUTH_URL` is `http://localhost:5173`.

Payments need the [Stripe CLI](https://docs.stripe.com/stripe-cli) running `stripe listen` (above) while you test: Stripe can't reach `localhost` itself, so the CLI receives its webhook events and passes them on to Express. The `whsec_...` secret it prints goes in `server/.env` as `STRIPE_WEBHOOK_SECRET_KEY`.

## Folder structure

The repo is an npm workspace with two packages, so one `npm install` at the root installs both. There is no `package-lock.json`: `.npmrc` turns it off (`package-lock=false`), so `npm install` takes the newest versions that `package.json` allows.

- `dev.js`: `npm run dev`, which runs the API and the Vite dev server together

- `client/`: the React app (Vite + Tailwind)
  - `src/components/`: one component per part of the page, plus one per extra view: `AuthForm` (`#signin`, `#signup`), `Cart` (`#cart`), `Checkout` (`#checkout`), `PaymentResult` (`#paid/<id>`, where Stripe sends people back), `MyBooks` (`#my-books`), `Saved` (`#saved`), `Account` (`#account`) and `Receipt` (`#order/<id>`). `Reviews` and `Recommendations` are the sections under each book
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
  - `src/orders.js`: `/api/orders`: starts a Stripe Checkout Session, order history and receipts
  - `src/webhook.js`: `/api/webhooks/stripe`, where Stripe confirms payments. The only code that marks an order paid
  - `src/stripe.js`: the Stripe client, made with `STRIPE_SECRET_KEY`
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
- `orders`: one row per checkout: who is buying, the `total`, the `status` (`pending`, `paid` or `cancelled`), Stripe's `stripe_session_id`, and when it was placed (`created_at`) and paid (`paid_at`). `card_last4` is only set on the older demo orders from Assignment 3; Stripe keeps the card now.
- `order_items`: the books in each order, with the quantity and the price at the time.
- `reviews`: a rating (1 to 5) and text per person per book. `UNIQUE (user_id, book_id)` means writing again replaces your old review.
- `user`, `session`, `account`, `verification`: created and managed by Better Auth. `user` holds name, email, the profile picture (`image`) and `role` (`customer` or `admin`); `account` holds the hashed password; `session` holds one row per signed-in browser.

`stock`, `seats` and the Stripe columns on `orders` were added after their tables already existed, so `schema.sql` adds them with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which is safe to run again. `status` is added with `DEFAULT 'paid'`, so the old demo orders count as paid, and then its default is changed to `'pending'` for new ones.

## API

| Route | Returns |
| --- | --- |
| `GET /api/_/health` | `{ status: 'ok' }` with a 200, to check the API is up |
| `GET /api/books` | every book, with its average `rating`, `reviewCount` and `stock` |
| `GET /api/books?page=2&q=river&section=Fiction&sort=price-low` | one page (8 books) of the matching books: `{ books, total, page, perPage, pageCount }`. `q` searches title, author and ISBN; `sort` is `featured`, `price-low`, `price-high`, `rating` or `newest` |
| `GET /api/books/:id` | one book, or 404 |
| `GET /api/books/:id/reviews` | `{ canReview, reviews }`: the reviews, newest first, and whether the signed-in person may write one |
| `GET /api/books/:id/recommendations` | up to 4 books that this book's buyers also bought, most buyers first |
| `POST /api/books/:id/reviews` | `{ rating, text }`: add or replace your review. Signed in, and only for books you bought |
| `POST /api/orders` | `{ items }`: save a pending order and start a Stripe Checkout Session. Answers `{ id, url }`, the Stripe page to go to. Signed in |
| `GET /api/orders` | your paid and pending orders (not cancelled ones), newest first, with their books. Signed in |
| `POST /api/orders/:id/pay` | back to Stripe's page for one of your pending orders: `{ url }` while its session is open, 409 once it is paid or expired. Signed in |
| `GET /api/orders/:id` | one of your orders, with its `status`, for the success page and the receipt. Signed in |
| `POST /api/webhooks/stripe` | Stripe's events. Only accepted with a valid `stripe-signature` header |
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

## Payment (Stripe Checkout, test mode)

Stripe runs in test mode: the keys start with `sk_test_`, Stripe's page says "Sandbox", and only test cards work. Pay with `4242 4242 4242 4242`, any future date and any CVC.

1. **Buy now** (`#checkout`, signed in only): `Checkout` sends the cart's book ids and quantities to `POST /api/orders`. The route sits behind `requireUser`, so every order belongs to a signed-in user.
2. **The checkout route** (`server/src/orders.js`) looks the prices up in the database itself, so the browser can't change what it pays. In one transaction (`BEGIN` ... `COMMIT`) it takes the books off the shelf (`UPDATE books SET stock = stock - n WHERE ... AND stock >= n`), saves the order as `pending` with its `order_items`, and asks Stripe for a Checkout Session with those books and prices (in cents). It saves the session's id on the order and answers with the session's `url`. If anything fails, Stripe included, `ROLLBACK` undoes it all.
3. **Stripe's page**: the browser goes to that `url`, and the customer types the card in there, so our site never sees it.
4. **The webhook** (`server/src/webhook.js`): when the payment completes, Stripe sends `checkout.session.completed` to `POST /api/webhooks/stripe`. `stripe.webhooks.constructEvent` checks the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET_KEY`, so a fake request is refused with 400. Then it finds the order by its session id and sets `status = 'paid'`. This is the only place an order becomes paid. If the payment fails (`async_payment_failed`) or the customer never pays and the session expires after 30 minutes (`checkout.session.expired`), it sets `cancelled` and puts the books back. Every update has `AND status = 'pending'`, so when Stripe sends the same event twice, the second one changes nothing.
5. **The success page**: Stripe sends the browser to `#paid/<id>`. `PaymentResult` asks `GET /api/orders/<id>` for the status. The webhook can arrive a moment after the customer, so while the order is still `pending` it asks again every 2 seconds (up to 6 times). Once it's `paid`, the page says so and the cart is emptied. Afterwards there is a printable receipt at `#order/<id>`.
6. **Pressing Back on Stripe's page** brings the customer back to `#checkout` without paying. The order stays `pending`, and My books shows it as "Pending payment" with a **Pay now** button. That calls `POST /api/orders/:id/pay`, which asks Stripe for the same session (`stripe.checkout.sessions.retrieve`) and, while it is still open, sends the customer back to its page. If it is already paid (the webhook is on its way) or expired, the button shows why instead. This route only reads from Stripe; the status still only changes in the webhook, and the 30-minute expiry still cancels the order and puts the books back.

The webhook is mounted in `index.js` before `express.json()`, with `express.raw()`: the signature is worked out from the exact bytes Stripe sent, and `express.json()` would turn them into an object first.

The Stripe webhook endpoint listens for four events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`.

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

## Motion

The homepage hero fades up when it loads (`animate-fade-up`, a keyframe in `index.css`), with the three covers following one after another (`animationDelay`). Behind it, three blurred colour blobs drift slowly (`animate-drift`) over a faint grid of dots (`.hero-dots`), and the covers bob gently (`animate-float`). Books, Staff Picks and Events are wrapped in `Reveal`, which uses `IntersectionObserver` to fade each one in the first time it scrolls into view. People who turned on "reduce motion" on their computer get no movement (`motion-safe:` and `motion-reduce:`).

## How login works

1. `AuthForm` calls `authClient.signUp.email()` or `authClient.signIn.email()`.
2. Better Auth on the server checks the password, adds a row to `session` and sends back a cookie holding the session token, signed with `BETTER_AUTH_SECRET`.
3. The browser sends that cookie with every request. `useSession()` in `Header` asks `/api/auth/get-session` who it belongs to, so after a refresh you are still signed in.
4. Sign out deletes the session row and the cookie.

On `#account` people can change their name and password, and upload a picture. The picture is shrunk to 160x160 in the browser and saved as text (a data URL) in the user's `image` field, so no file storage is needed.

## Secrets

`server/.env` holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET_KEY`. It is listed in `.gitignore` and never committed; `server/.env.example` shows the names. In production the same values are set as Railway variables.

## Deployment

One Railway service runs the whole app from the repo root. Its commands are set in the service's Settings on Railway:

- Build: `npm run build` builds the React app into `client/dist`
- Pre-deploy: `npm run migrate -w server`
- Start: `npm start` runs Express, which serves both `/api` and the built React app

The Postgres database is a second Railway service, `bookstore-pgdb`. The app's `DATABASE_URL` variable is a reference to it, `${{bookstore-pgdb.DATABASE_URL}}`, so Railway fills in the address itself.

The site and the API share one URL, so the session cookie needs no CORS setup.

For payments in production, the app's Railway variables also hold `STRIPE_SECRET_KEY` (the same test key) and `STRIPE_WEBHOOK_SECRET_KEY`: the signing secret of the webhook endpoint in the Stripe dashboard, which points at `https://mayerfeld-bookstore-assessment.up.railway.app/api/webhooks/stripe`. That secret is different from the one `stripe listen` prints locally.
