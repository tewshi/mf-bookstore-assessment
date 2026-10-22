-- The shop's own tables. The login tables (user, session, account,
-- verification) belong to Better Auth, which creates them in migrate.js.

-- One row per book. id is the slug used in links, e.g. #book/slow-maps.
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

-- One row per event in the shop.
CREATE TABLE IF NOT EXISTS events (
  id       text PRIMARY KEY,
  starts_at timestamp NOT NULL,
  label    text NOT NULL,
  title    text NOT NULL,
  text     text NOT NULL
);
