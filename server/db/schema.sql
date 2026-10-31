-- The shop's own tables. The login tables (user, session, account,
-- verification) belong to Better Auth, which creates them in migrate.js.

-- One row per book. id is the slug used in links, e.g. /book/slow-maps.
CREATE TABLE IF NOT EXISTS books (
  id               text PRIMARY KEY,
  title            text NOT NULL,
  author           text NOT NULL,
  section          text NOT NULL CHECK (section IN ('Fiction', 'Nonfiction')),
  isbn             text NOT NULL UNIQUE,
  price            numeric(6, 2) NOT NULL,
  image            text NOT NULL,
  description      text NOT NULL,
  format           text NOT NULL,
  pages            integer NOT NULL,
  published        integer NOT NULL,
  -- Both null, or both set when a bookseller recommends the book
  staff_pick_quote text,
  staff_pick_by    text
);

-- How many copies are on the shelf. Added after the table already existed,
-- so it's an ALTER: ADD COLUMN IF NOT EXISTS adds it once and is skipped
-- on later runs. New databases get it the same way.
ALTER TABLE books ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 10 CHECK (stock >= 0);

-- One row per event in the shop.
CREATE TABLE IF NOT EXISTS events (
  id       text PRIMARY KEY,
  starts_at timestamp NOT NULL,
  label    text NOT NULL,
  title    text NOT NULL,
  text     text NOT NULL
);

-- How many people fit, for event sign-up (added later, hence the ALTER)
ALTER TABLE events ADD COLUMN IF NOT EXISTS seats integer NOT NULL DEFAULT 20 CHECK (seats > 0);

-- One row per checkout. "user" is Better Auth's table; it needs quotes
-- because user is a reserved word in SQL.
CREATE TABLE IF NOT EXISTS orders (
  id         serial PRIMARY KEY,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  total      numeric(8, 2) NOT NULL,
  -- Only the last 4 digits of the (test) card, never the whole number
  card_last4 text NOT NULL,
  -- timestamptz: a moment in time, shown in each visitor's own timezone
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stripe payments (added later, hence the ALTERs). An order starts as
-- 'pending' when we send the customer to Stripe. Only the webhook changes
-- it: to 'paid' when Stripe confirms the money, or to 'cancelled' when
-- the payment fails or the customer never finishes.
-- The column is added with DEFAULT 'paid' so the older demo orders (which
-- were all paid) get 'paid'; then new orders default to 'pending'.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid'
  CHECK (status IN ('pending', 'paid', 'cancelled'));
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'pending';
-- Stripe's id for the checkout session (cs_test_...), so the webhook can find the order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text UNIQUE;
-- When the webhook marked it paid
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at timestamptz;
-- Stripe keeps the card, so new orders have no card_last4
ALTER TABLE orders ALTER COLUMN card_last4 DROP NOT NULL;

-- Refunds (added later). An admin refunds a paid order from the admin
-- page, or in the Stripe dashboard, and webhook.js then sets 'refunded'.
-- A CHECK can't be changed in place, so drop it and add the new list;
-- IF EXISTS keeps this safe to run again.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded'));
-- When it was refunded
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;

-- The books in each order. price is what the book cost at checkout,
-- so an old order stays the same when a price changes later.
CREATE TABLE IF NOT EXISTS order_items (
  order_id integer NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  book_id  text NOT NULL REFERENCES books(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  price    numeric(6, 2) NOT NULL,
  PRIMARY KEY (order_id, book_id)
);

-- One review per person per book. Writing again replaces the old one.
CREATE TABLE IF NOT EXISTS reviews (
  id         serial PRIMARY KEY,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  book_id    text NOT NULL REFERENCES books(id),
  rating     integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Books someone saved for later (the heart on each book). The primary key
-- on both columns means a book can only be saved once per person.
CREATE TABLE IF NOT EXISTS wishlist (
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  book_id    text NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, book_id)
);

-- Who reserved a seat at which event. One seat per person per event.
CREATE TABLE IF NOT EXISTS event_signups (
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  event_id   text NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- The messages under the bell in the header, e.g. "Payment received for
-- order #12". One row per person per message; read_at stays null until
-- they have seen it. link is where clicking it goes, e.g. /order/12.
CREATE TABLE IF NOT EXISTS notifications (
  id         serial PRIMARY KEY,
  user_id    text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  text       text NOT NULL,
  link       text,
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- The bell asks for one person's newest messages every time it opens
CREATE INDEX IF NOT EXISTS notifications_user_newest ON notifications (user_id, created_at DESC);
