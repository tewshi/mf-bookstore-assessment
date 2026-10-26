// Copies the Week 2 arrays into the database. Safe to run again.
// Rows are updated in place rather than deleted: orders, reviews and seat
// reservations point at them, so deleting would fail (or lose history).
import { pool } from '../src/lib/db.js'
import { books } from './data/books.js'
import { events } from './data/events.js'

for (const book of books) {
  await pool.query(
    `INSERT INTO books (id, title, author, section, isbn, price, image, description,
                        format, pages, published, staff_pick_quote, staff_pick_by, stock)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     -- Already there? Then overwrite it with this data instead.
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title, author = EXCLUDED.author, section = EXCLUDED.section,
       isbn = EXCLUDED.isbn, price = EXCLUDED.price, image = EXCLUDED.image,
       description = EXCLUDED.description, format = EXCLUDED.format, pages = EXCLUDED.pages,
       published = EXCLUDED.published, staff_pick_quote = EXCLUDED.staff_pick_quote,
       staff_pick_by = EXCLUDED.staff_pick_by, stock = EXCLUDED.stock`,
    [
      book.id, book.title, book.author, book.section, book.isbn, book.price, book.image,
      book.description, book.format, book.pages, book.published,
      book.staffPick?.quote ?? null, book.staffPick?.by ?? null, book.stock,
    ],
  )
}

// Events are updated in place too, so people's seat reservations survive
for (const event of events) {
  await pool.query(
    `INSERT INTO events (id, starts_at, label, title, text, seats) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       starts_at = EXCLUDED.starts_at, label = EXCLUDED.label, title = EXCLUDED.title,
       text = EXCLUDED.text, seats = EXCLUDED.seats`,
    [event.id, event.datetime, event.label, event.title, event.text, event.seats],
  )
}

console.log(`Seeded ${books.length} books and ${events.length} events`)
await pool.end()
