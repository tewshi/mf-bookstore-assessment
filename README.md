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
stripe listen --all-snapshot --forward-to localhost:3000/api/webhooks/stripe   # in a second terminal, for payments
npm run make-admin -w server -- you@example.com   # optional: make your account an admin
```

The root `Makefile` has short names for the everyday ones: `make dev`, `make stripe`, `make build`, `make start`, `make lint` (`make` alone lists them). `make dev` is `npm run dev` plus the Stripe listener in the same terminal (`node dev.js --stripe`), so it needs the Stripe CLI installed and logged in; if `stripe` stops, the other two stop as well. `make stripe` on its own runs `stripe listen --all-snapshot` and forwards to whichever port the running API is listening on (found with `pgrep` + `lsof`; it waits up to 10 seconds for the API to start), falling back to `PORT` in `server/.env`, then 3000.

Open **http://localhost:5173**, not :3000. In dev, Express on :3000 only answers `/api`; Vite serves the page and passes every `/api` request on to Express. `dev.js` (in the repo root) starts both with Node's built-in `child_process`, so no extra package is needed; Ctrl+C stops both, and if one of them stops on its own, so does the other.

For local development, `DATABASE_URL` points at a Postgres on your machine (e.g. `postgresql://localhost:5432/mayerfeld`) and `BETTER_AUTH_URL` is `http://localhost:5173`.

Payments need the [Stripe CLI](https://docs.stripe.com/stripe-cli) running `stripe listen` (above) while you test: Stripe can't reach `localhost` itself, so the CLI receives its webhook events and passes them on to Express. The `whsec_...` secret it prints goes in `server/.env` as `STRIPE_WEBHOOK_SECRET_KEY`.

## Folder structure

The repo is an npm workspace with two packages, so one `npm install` at the root installs both. There is no `package-lock.json`: `.npmrc` turns it off (`package-lock=false`), so `npm install` takes the newest versions that `package.json` allows.

- `Makefile`: short names for `npm run dev`, `stripe listen`, build, start and lint
- `dev.js`: `npm run dev`, which runs the API and the Vite dev server together (`--stripe`, used by `make dev`, adds `make stripe`)

- `client/`: the React app (Vite + Tailwind)
  - `src/App.jsx`: the state the whole site shares (books, cart, saved books, toast) and the routing that picks a page from the address (see [Page addresses](#page-addresses))
  - `src/pages/`: one file per page App can show: `Home` (`/`), `BookDetails` (`/book/<id>`), `SignIn` (`/signin` and `/signup`), `Cart` (`/cart`), `Checkout` (`/checkout`), `Paid` (`/paid/<id>`, where Stripe sends people back), `Orders` (`/orders`), `Wishlist` (`/wishlist`), `Account` (`/account`), `Receipt` (`/order/<id>`) and `NotFound` (any other address, or a book id that doesn't exist)
  - `src/pages/admin/`: the `/admin` page and its Orders, Books, Events and Users tabs
  - `src/components/`: the pieces the pages are built from, in four folders:
    - `layout/`: on every page. `Header` is the top bar, `UserMenu` the avatar dropdown, `NotificationBell` the bell with the unread count (signed-in people only), `MobileMenu` the drawer behind the hamburger button on phones, `ThemeToggle` the light/dark button, `Footer`, and `accountLinks.js` the links in the account menu (Admin only for admins)
    - `books/`: `BookCard`, `BookGrid` (search, sort, section filter and pages, all asked of the API), `StarRating`, and `Reviews` and `Recommendations`, the sections under each book
    - `home/`: the other parts of the home page: `Hero`, `StaffPicks` and `Events`
    - `ui/`: small general pieces: `Icons` (the SVG icons), `Avatar`, `Toast` (the short message at the bottom, "Added to your cart"), `Reveal` (fades a section in), and the pieces every list shares: `Select` (the round dropdown), `SearchBox`, `Pagination` (Previous, page numbers, Next; hidden when there is only one page) and `RefreshButton` (fetches the list again, on the admin tabs, Orders and Wishlist)
  - `src/lib/`: plain JavaScript, no components:
    - `api.js`: `getJson()`, `sendJson()` and `postJson()`, small `fetch` wrappers
    - `auth.js`: the Better Auth client (`signIn`, `signUp`, `signOut`, `useSession`)
    - `cart.js`: turns the saved cart into a list of books and a total
    - `usePages.js`: splits a list the page already has (orders, events, staff picks) into pages. The book grid instead asks the server for one page at a time
    - `useLive.js`: `useLive(topic, load)`, which runs a list's `load()` again when the server says that kind of data changed (see [Live updates](#live-updates))
    - `navigate.js`: `navigate()`, which changes the page without loading it again, and the click handler that sends our links through it
    - `resizeImage.js`: shrinks a profile picture to 160x160 before it is saved
- `server/`: the Express API
  - `src/index.js`: starts Express, mounts auth and the API, serves `client/dist`
  - `src/routes/`: one file per part of the API
    - `api.js`: the `/api` router. It has the health check and mounts the files below
    - `books.js`: `/api/books`, one book, and its recommendations
    - `reviews.js`: `/api/books/:id/reviews`
    - `orders.js`: `/api/orders`: starts a Stripe Checkout Session, order history and receipts
    - `webhook.js`: `/api/webhooks/stripe`, where Stripe confirms payments. The only code that marks an order paid
    - `wishlist.js`: `/api/wishlist`, the saved books
    - `events.js`: `/api/events` and seat reservations
    - `live.js`: `/api/live`, the open connection each tab listens on for live updates
    - `notifications.js`: `/api/notifications`, the messages under the bell, and marking them read
    - `admin.js`: `/api/admin`, for admins only. It checks the role, then mounts `admin/orders.js`, `admin/books.js`, `admin/events.js` and `admin/users.js` (one per admin tab)
  - `src/lib/`: the setup the routes share
    - `db.js`: one `pg` connection pool, shared by everything
    - `auth.js`: Better Auth setup (email and password, plus a `role` field on users)
    - `session.js`: `currentUser()`, `requireUser` and `requireAdmin`, which find the signed-in person from the session cookie
    - `stripe.js`: the Stripe client, made with `STRIPE_SECRET_KEY`
    - `notifications.js`: `sendNotification`, `sendToAdmins` and `sendBackInStock`, which save messages for the bell (see [Notifications](#notifications))
    - `live.js`: the open `/api/live` connections (with who opened each), and `notifyEveryone`, `notifyUser`, `notifyAdmins` and `notifyUserAndAdmins`, which the routes call after they change something
  - `db/schema.sql`: the shop's tables (see below)
  - `db/migrate.js`: creates Better Auth's tables, then runs `schema.sql`
  - `db/seed.js`: copies the arrays in `db/data/` (24 books, 7 events) into the database. Rows are updated in place, so orders, reviews and reservations survive a re-seed
  - `db/make-admin.js`: makes an account an admin (`--undo` to reverse)

## The database

- `books`: one row per book. `id` is the slug used in links (`/book/slow-maps`). A book is a staff pick when `staff_pick_quote` is set. `stock` is how many copies are on the shelf.
- `events`: one row per event, sorted by `starts_at`. `seats` is how many people fit.
- `event_signups`: who reserved a seat at which event (one per person per event).
- `wishlist`: the books each person saved for later (the hearts).
- `orders`: one row per checkout: who is buying, the `total`, the `status` (`pending`, `paid`, `cancelled` or `refunded`), Stripe's `stripe_session_id`, and when it was placed (`created_at`), paid (`paid_at`) and refunded (`refunded_at`). `card_last4` is only set on the older demo orders from Assignment 3; Stripe keeps the card now.
- `notifications`: the messages under the bell: who it is for, the `text`, where clicking it goes (`link`), and `read_at` (null while unread).
- `order_items`: the books in each order, with the quantity and the price at the time.
- `reviews`: a rating (1 to 5) and text per person per book. `UNIQUE (user_id, book_id)` means writing again replaces your old review.
- `user`, `session`, `account`, `verification`: created and managed by Better Auth. `user` holds name, email, the profile picture (`image`) and `role` (`customer` or `admin`); `account` holds the hashed password; `session` holds one row per signed-in browser.

`stock`, `seats` and the Stripe columns on `orders` were added after their tables already existed, so `schema.sql` adds them with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, which is safe to run again. `status` is added with `DEFAULT 'paid'`, so the old demo orders count as paid, and then its default is changed to `'pending'` for new ones. Adding `refunded` meant changing the `CHECK` on `status`, which can't be edited in place: `schema.sql` drops `orders_status_check` (`IF EXISTS`) and adds it again with the new list.

## API

| Route | Returns |
| --- | --- |
| `GET /api/_/health` | `{ status: 'ok' }` with a 200, to check the API is up |
| `GET /api/books` | every book, with its average `rating`, `reviewCount` and `stock` |
| `GET /api/books?page=2&q=river&section=Fiction&sort=price-low` | one page (12 books) of the matching books: `{ books, total, page, perPage, pageCount }`. `q` searches title, author and ISBN; `sort` is `featured`, `price-low`, `price-high`, `rating` or `newest` |
| `GET /api/books/:id` | one book, or 404 |
| `GET /api/books/:id/reviews` | `{ canReview, reviews }`: the reviews, newest first, and whether the signed-in person may write one |
| `GET /api/books/:id/recommendations` | up to 4 books that this book's buyers also bought, most buyers first |
| `POST /api/books/:id/reviews` | `{ rating, text }`: add or replace your review. Signed in, and only for books you bought |
| `POST /api/orders` | `{ items, orderId? }`: save a pending order and start a Stripe Checkout Session. Answers `{ id, url }`, the Stripe page to go to. With `orderId` (an unpaid order) and the same items, reuses that order instead. Signed in |
| `GET /api/orders` | your paid and pending orders (not cancelled ones), newest first, with their books. Signed in |
| `POST /api/orders/:id/pay` | back to Stripe's page for one of your pending orders: `{ url }` while its session is open, 409 once it is paid or expired. Signed in |
| `GET /api/orders/:id` | one of your orders, with its `status`, for the success page and the receipt. Signed in |
| `POST /api/webhooks/stripe` | Stripe's events. Only accepted with a valid `stripe-signature` header |
| `GET /api/wishlist` | the ids of the books you saved. Signed in |
| `PUT /api/wishlist/:bookId`, `DELETE /api/wishlist/:bookId` | save or un-save a book. Signed in |
| `GET /api/events` | upcoming events, soonest first, with `seatsLeft` and whether you are `going` |
| `POST /api/events/:id/signup`, `DELETE /api/events/:id/signup` | reserve or give back a seat. Signed in |
| `GET /api/admin/counts` | `{ orders, books, events, users }`, for the numbers on the admin tabs. Admins |
| `GET /api/admin/orders` | every order, with the customer, and `refundable` (paid through Stripe). Admins |
| `POST /api/admin/orders/:id/refund` | refund a paid order in full through Stripe, and put its books back. 409 for an order that isn't paid, or an old demo order with no Stripe payment. Admins |
| `GET /api/admin/users` | everyone with an account: role, join date, paid orders and total spent. Admins |
| `POST /api/admin/books`, `PUT` / `DELETE /api/admin/books/:id` | add, edit or delete a book (books that were ordered can't be deleted). Admins |
| `GET /api/admin/events`, `POST /api/admin/events`, `PUT` / `DELETE /api/admin/events/:id` | all events, past ones too; add, edit or delete one. Admins |
| `GET /api/notifications` | `{ unread, notifications }`: your newest 20 messages, and how many of all of them are unread. Signed in |
| `POST /api/notifications/read`, `POST /api/notifications/:id/read` | mark all of them, or one, read. Signed in |
| `GET /api/live` | an event stream that stays open: a `data: <topic>` line whenever something this person may see changes (public books, events and reviews; their own wishlist and orders; for admins, every order and the users), and `data: ping` every 25 seconds. Never the data itself |
| `/api/auth/*` | Better Auth: `sign-up/email`, `sign-in/email`, `sign-out`, `get-session` |

## Page addresses

Every page has its own address: `/cart`, `/book/slow-maps`, `/order/12`, `/admin/books`. A `#` is only used to jump to a section of a page: `/#events` on the home page, `/book/slow-maps#reviews` on a book.

There is still only one HTML page. `App.jsx` splits the path at each `/` into a page and a parameter (`/book/slow-maps` is page `book`, parameter `slow-maps`) and shows that page's component. No router library is needed:

1. **Clicking a link**: `App` listens for clicks on the whole page. For one of our own links, `handleLinkClick` (in `lib/navigate.js`) stops the browser from fetching the page from the server and calls `navigate()` instead. Links to other sites, Ctrl/Cmd-clicks (new tab) and `#` links within the same page are left to the browser.
2. **`navigate()`** calls `history.pushState()`, which changes the address bar without loading anything, then fires a `popstate` event. `App` listens for `popstate`, reads the new address and shows the new page. The cart, the session and the loaded books stay as they are.
3. **Back and Forward**: the browser fires `popstate` itself, so they work the same way.
4. **Typing an address or refreshing**: the browser asks the server for `/orders`. In dev, Vite answers any page address with `index.html`. In production, `server/src/index.js` does the same after the static files, for any GET that isn't under `/api`.

After `/signin/checkout` the form goes on to `/checkout` with `navigate(..., { replace: true })`, so Back doesn't return to the sign-in form. Someone who is already signed in is sent on straight away.

## The cart

The cart lives in the browser, not the database. `App` keeps it in state as `{ bookId: quantity }` and saves it to `localStorage` whenever it changes, so it survives a refresh. The header badge, the Add buttons and the `/cart` page all read the same state. After a successful payment, the `Paid` page empties it.

## Payment (Stripe Checkout, test mode)

Stripe runs in test mode: the keys start with `sk_test_`, Stripe's page says "Sandbox", and only test cards work. Pay with `4242 4242 4242 4242`, any future date and any CVC.

1. **Buy now** (`/checkout`, signed in only): `Checkout` sends the cart's book ids and quantities to `POST /api/orders`. The route sits behind `requireUser`, so every order belongs to a signed-in user.
2. **The checkout route** (`server/src/routes/orders.js`) looks the prices up in the database itself, so the browser can't change what it pays. In one transaction (`BEGIN` ... `COMMIT`) it takes the books off the shelf (`UPDATE books SET stock = stock - n WHERE ... AND stock >= n`), saves the order as `pending` with its `order_items`, and asks Stripe for a Checkout Session with those books and prices (in cents). It saves the session's id on the order and answers with the session's `url`. If anything fails, Stripe included, `ROLLBACK` undoes it all.
3. **Stripe's page**: the browser goes to that `url`, and the customer types the card in there, so our site never sees it.
4. **The webhook** (`server/src/routes/webhook.js`): when the payment completes, Stripe sends `checkout.session.completed` to `POST /api/webhooks/stripe`. `stripe.webhooks.constructEvent` checks the `stripe-signature` header with `STRIPE_WEBHOOK_SECRET_KEY`, so a fake request is refused with 400. Then it finds the order by its session id and sets `status = 'paid'`. This is the only place an order becomes paid. If the payment fails (`async_payment_failed`) or the customer never pays and the session expires after 30 minutes (`checkout.session.expired`), it sets `cancelled` and puts the books back. Every update has `AND status = 'pending'`, so when Stripe sends the same event twice, the second one changes nothing.
5. **The success page**: Stripe sends the browser to `/paid/<id>`. `Paid` asks `GET /api/orders/<id>` for the status. The webhook can arrive a moment after the customer, so while the order is still `pending` it asks again every 2 seconds (up to 6 times). Once it's `paid`, the page says so and the cart is emptied. Afterwards there is a printable receipt at `/order/<id>`.
6. **Pressing Back on Stripe's page** brings the customer back to Orders (`/orders`) without paying. The order stays `pending` and shows there with a Pay now button (step 7). Checkout opened as `/checkout/<id>` also sends that `orderId` along with the cart on Buy now, and the server (`reuseOrder` in `orders.js`) compares the cart with the order's saved items. The same books in the same quantities: it sends them back to the same Stripe page, so there is no second order. A different cart: it expires the old session (`stripe.checkout.sessions.expire`), so the webhook cancels the old order and puts its books back, and then it makes a new order as usual. The comparison happens on the server, so the browser can't claim a match that isn't there.
7. **Paying later from Orders**: an unpaid order shows "Pending payment" there, with a **Pay now** button that calls `POST /api/orders/:id/pay`, which asks Stripe for the same session (`stripe.checkout.sessions.retrieve`) and, while it is still open, sends the customer back to its page. If it is already paid (the webhook is on its way) or expired, the button shows why instead. This route only reads from Stripe; the status still only changes in the webhook, and the 30-minute expiry still cancels the order and puts the books back.

8. **Refunds**: on Admin → Orders, a paid order has a **Refund** button (two clicks: "Refund", then "Really refund €12.00?"). It calls `POST /api/admin/orders/:id/refund`, which looks up the order's payment through its checkout session and asks Stripe for a full refund (`stripe.refunds.create`). Once Stripe says yes, `refundOrder` in `webhook.js` sets `status = 'refunded'` and `refunded_at`, and puts the books back on the shelf, in one transaction. Only full refunds, and only orders paid through Stripe: the old demo orders have no Stripe payment to refund.
9. **Refunds made in the Stripe dashboard** reach us too: Stripe sends `charge.refunded`. Its object is the charge, not the checkout session, so the webhook asks Stripe for the session that belongs to that payment (`stripe.checkout.sessions.list({ payment_intent })`) and calls the same `refundOrder`. A refund from our own button also sends this event; `refundOrder` only changes orders that are still `paid`, so the second time changes nothing. A partial refund in the dashboard is ignored (`charge.refunded` is only true once all of it is refunded).

The webhook is mounted in `index.js` before `express.json()`, with `express.raw()`: the signature is worked out from the exact bytes Stripe sent, and `express.json()` would turn them into an object first.

The Stripe webhook endpoint listens for five events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`. Locally, `stripe listen --all-snapshot` forwards every event, so nothing needs choosing.

## Searching and pages

The book grid asks the API for one page at a time: `GET /api/books?page=1&q=...&section=...&sort=...`. The server filters with `ILIKE` (title, author) and compares ISBNs without their dashes, counts the matches for the page numbers, then fetches just that page with `LIMIT 8 OFFSET ...`. `ORDER BY` can't use a `$1` placeholder, so the sort name is looked up in a fixed list (`sortOrders`) and anything else falls back to the default, so no text from the request ever ends up in the SQL. While you type, the grid waits until you pause for 300 ms before searching.

## Reviews

Only people who bought a book can review it: the server checks `order_items` before saving. Each book page loads its reviews from `GET /api/books/:id/reviews`, and buyers get a form with the `StarRating` component. Orders (`/orders`, in the account menu) lists every order with a "Write a review" link for each book, which opens `/book/<id>#reviews`.

## Live updates

Every list on the site updates by itself when someone changes it: stock when someone else checks out, an order turning paid when the webhook arrives, seats on the events, new reviews, and every admin tab. It uses Server-Sent Events (SSE), which browsers support with `EventSource`, so there is no extra package.

1. **One connection per tab.** The first list on the page opens `GET /api/live` (`client/src/lib/useLive.js`), and every other list shares it: browsers allow only about 6 open requests per site.
2. **The server remembers it, and who it is.** `routes/live.js` looks up the session cookie like any other route, and `server/src/lib/live.js` keeps `{ res, userId, isAdmin }` for each open tab in a `Set`, and takes it out when the tab closes.
3. **A route changes something, then tells the people it concerns.** There are four functions, so each call says who it is for:
   - `notifyEveryone(topic)`: public data. Every tab, signed in or not.
   - `notifyUser(topic, userId)`: one person's own data. Only their tabs and devices.
   - `notifyUserAndAdmins(topic, userId)`: an order. The buyer's tabs, and every admin's.
   - `notifyAdmins(topic)`: staff-only data. Every admin's tabs.

   For example, checkout calls `notifyUserAndAdmins('orders', req.user.id)` and `notifyEveryone('books')` (the stock) after its `COMMIT`. Sign-ups and profile changes go through Better Auth, so `databaseHooks` in `lib/auth.js` send them.
4. **Each list fetches again.** A list says what it listens for next to its `load()`: `useLive('orders', load)`. Only the topic travels over `/api/live`; the list fetches the data through its usual route, so the usual sign-in and admin checks still decide who sees what.

The topics and who listens:

| Topic | Sent to | Sent by | Fetched again by |
| --- | --- | --- | --- |
| `books` | everyone | checkout, paid and cancelled orders, reviews, admin books | App's book list (grid, staff picks, book pages, cart, wishlist, admin books), recommendations |
| `orders` | the buyer and admins | checkout, the webhook (paid or cancelled) | Orders, the review form, admin orders and users |
| `events` | everyone | seat sign-ups, admin events | home page events, Orders' "Your events", admin events |
| `wishlist` | that person only | saving or un-saving a book | the hearts and the wishlist |
| `reviews` | everyone | a new or changed review, a new name or picture | the reviews under a book |
| `users` | admins | sign-up, a new name or picture | admin users |
| `notifications` | that person only | a new message for them, or one marked read | the bell |

**Signing in or out.** The server decides what a tab hears when the tab connects, so `App` calls `liveSignedInAs(userId)` once the session is known, and `useLive.js` connects again whenever the person changes.

**Keeping it alive.** The server sends `data: ping` every 25 seconds, so proxies (Railway's, Vite's) don't close a quiet connection. The page also uses the ping to notice a dead connection. When Express restarts, Vite's proxy can keep the browser's side open with nothing behind it, so if no ping arrives for a minute, `useLive.js` connects again. `EventSource` reconnects by itself after a network error, but gives up after an error page (Vite or Railway while the server restarts); then `useLive.js` tries again every 5 seconds. After any reconnect, every list fetches again, in case something changed meanwhile.

**Limits.** Who a tab is was decided when it connected: making someone an admin, or signing out on another device, takes effect when that tab connects again (a reload, or the next sign-in). It only ever hears topic names, so nothing private leaks meanwhile. The connections are kept in memory, which works because the site runs as one server; changes made outside it (`npm run seed`, `make-admin`) aren't announced, and show up on the next fetch or Refresh.

## Notifications

Signed-in people have a bell in the header. The number on it is how many messages are unread; clicking it shows the newest 20, and clicking a message marks it read and opens its link. "Mark all as read" clears the number.

Each message is a row in the `notifications` table, saved by `server/src/lib/notifications.js` after the change it is about:

| Message | For | Sent from |
| --- | --- | --- |
| Payment received for order #12 | the buyer | `markPaid` in `webhook.js` |
| New order #12 from Ada, €24.00 | every admin | `markPaid` in `webhook.js` |
| Order #12 was cancelled (not paid in time, or the payment failed) | the buyer | `cancelOrder` in `webhook.js` |
| Order #12 was refunded | the buyer | `refundOrder` in `webhook.js` |
| "A Winter Orchestra" from your wishlist is back in stock | everyone with it on their wishlist | when stock goes from 0 to more: an admin edit, a cancelled order or a refund |
| An event you have a seat at was changed, or cancelled | everyone with a seat | `routes/admin/events.js` |

After saving, `notifyUser('notifications', userId)` tells that person's open tabs, so the bell updates at once on every device they're signed in on (see [Live updates](#live-updates)). Marking a message read does the same, so the number goes down everywhere. A notification is an extra: if saving one fails, it is logged and the payment or edit that caused it still goes through.

To know whether a book was sold out, the admin edit uses `UPDATE books ... FROM books AS before`: `before` is the same row as it was before the update, so `RETURNING before.stock` gives the old stock. The cancel and refund code works it out from `RETURNING`: the new stock minus the quantity put back.

## Recommendations

Under each book, "Readers who bought this also bought" comes from `GET /api/books/:id/recommendations`. The query in `server/src/routes/books.js` works in three steps (a `WITH` query):

1. `buyers`: everyone who has ordered this book.
2. `also_bought`: the other books those people ordered, and how many of them ordered each one.
3. Those books in full, with their ratings, the most-shared first, at most 4.

When nobody has bought the book yet, the list is empty, and the page shows "More in Fiction" (or Nonfiction) from the books it already has instead.

## Admin

Admins see an Admin link in the account menu. `/admin` has four tabs, each with how many there are on it (from `GET /api/admin/counts`, live): every order (with totals, a status filter, a name/email search, and a Refund button on paid ones), the books (add, edit, change stock, delete unordered ones; books with 3 or fewer copies are listed at the top as running low) the events (add, edit, delete) and the users (a read-only list with a role filter and a name/email search; roles change with `make-admin`). Every `/api/admin` route checks `role === 'admin'` on the server with `requireAdmin`; hiding the link is only for looks.

`role` is an extra field on Better Auth's `user` table (`additionalFields` in `server/src/lib/auth.js`) with `input: false`, so nobody can give themselves a role when signing up. To make someone an admin:

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

1. `SignIn` calls `authClient.signUp.email()` or `authClient.signIn.email()`.
2. Better Auth on the server checks the password, adds a row to `session` and sends back a cookie holding the session token, signed with `BETTER_AUTH_SECRET`.
3. The browser sends that cookie with every request. `useSession()` in `Header` asks `/api/auth/get-session` who it belongs to, so after a refresh you are still signed in.
4. Sign out deletes the session row and the cookie.

On `/account` people can change their name and password, and upload a picture. The picture is shrunk to 160x160 in the browser and saved as text (a data URL) in the user's `image` field, so no file storage is needed.

## Secrets

`server/.env` holds `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET_KEY`. It is listed in `.gitignore` and never committed; `server/.env.example` shows the names. In production the same values are set as Railway variables.

## Deployment

One Railway service runs the whole app from the repo root. Its commands are set in the service's Settings on Railway:

- Build: `npm run build` builds the React app into `client/dist`
- Pre-deploy: `npm run migrate -w server`
- Start: `npm start` runs Express, which serves both `/api` and the built React app

The Postgres database is a second Railway service, `bookstore-pgdb`. The app's `DATABASE_URL` variable is a reference to it, `${{bookstore-pgdb.DATABASE_URL}}`, so Railway fills in the address itself.

The site and the API share one URL, so the session cookie needs no CORS setup.

For payments in production, the app's Railway variables also hold `STRIPE_SECRET_KEY` (the same test key) and `STRIPE_WEBHOOK_SECRET_KEY`: the signing secret of the webhook endpoint in the Stripe dashboard, which points at `https://mayerfeld-bookstore-assessment.up.railway.app/api/webhooks/stripe`. That secret is different from the one `stripe listen` prints locally. For refunds made in the Stripe dashboard to show up on the site, that endpoint also needs the `charge.refunded` event (Stripe dashboard → Developers → Webhooks → the endpoint → add the event).
