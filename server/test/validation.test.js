import { describe, expect, test, vi } from 'vitest'

// The admin forms' checks (readBook, readEvent) and the books row ->
// API shape (toBook). Importing the route files would connect to the
// database, so lib/db.js is swapped for a fake with vi.mock: these
// functions never use it anyway.
vi.mock('../src/lib/db.js', () => ({ pool: { query: vi.fn() } }))

const { readBook } = await import('../src/routes/admin/books.js')
const { readEvent } = await import('../src/routes/admin/events.js')
const { toBook } = await import('../src/routes/books.js')

// A book as the admin form sends it: everything filled in correctly
const goodBook = {
  title: ' Slow Maps ',
  author: 'Ada Example',
  section: 'Fiction',
  isbn: '9780000000001',
  price: '14.50',
  image: '/books/slow-maps.jpg',
  description: 'A novel.',
  format: 'Paperback',
  pages: '320',
  published: '2024',
  stock: '5',
  staffPickQuote: '',
  staffPickBy: '',
}

describe('readBook', () => {
  test('cleans up a good book: trims text, turns numbers into numbers', () => {
    const { book, error } = readBook(goodBook)
    expect(error).toBeUndefined()
    expect(book.title).toBe('Slow Maps')
    expect(book.price).toBe(14.5)
    expect(book.pages).toBe(320)
    // Empty staff pick boxes mean "not a staff pick"
    expect(book.staffPickQuote).toBeNull()
  })

  test.each([
    [{ title: '' }, 'Please fill in every field'],
    [{ section: 'Poetry' }, 'Section must be Fiction or Nonfiction'],
    [{ price: '0' }, 'Price must be more than 0'],
    [{ price: 'free' }, 'Price must be more than 0'],
    [{ pages: '12.5' }, 'Pages must be a whole number'],
    [{ published: 'soon' }, 'Published must be a year, e.g. 2026'],
    [{ stock: '-1' }, 'Stock must be 0 or more'],
    [{ staffPickQuote: 'Loved it' }, 'A staff pick needs both a quote and who picked it'],
  ])('refuses %o', (change, message) => {
    expect(readBook({ ...goodBook, ...change })).toEqual({ error: message })
  })

  test('accepts a staff pick with both a quote and a name', () => {
    const { book } = readBook({ ...goodBook, staffPickQuote: 'Loved it', staffPickBy: 'Mia' })
    expect(book.staffPickBy).toBe('Mia')
  })
})

describe('readEvent', () => {
  const goodEvent = {
    datetime: '2026-11-07T19:00',
    title: 'Poetry night',
    text: 'Bring a poem.',
    seats: '20',
  }

  test('accepts a good event', () => {
    // seats arrives as text from the form and leaves as a number
    expect(readEvent(goodEvent)).toEqual({ event: { ...goodEvent, seats: 20 } })
  })

  test.each([
    [{ datetime: 'next friday' }, 'Pick a date and time'],
    [{ title: '  ' }, 'Please fill in every field'],
    [{ seats: '0' }, 'Seats must be 1 or more'],
  ])('refuses %o', (change, message) => {
    expect(readEvent({ ...goodEvent, ...change })).toEqual({ error: message })
  })
})

describe('toBook', () => {
  const row = {
    id: 'slow-maps',
    title: 'Slow Maps',
    price: '14.00',
    staff_pick_quote: null,
    staff_pick_by: null,
    rating: '4.5000',
    review_count: 2,
  }

  test('turns Postgres strings into numbers', () => {
    const book = toBook(row)
    expect(book.price).toBe(14)
    expect(book.rating).toBe(4.5)
  })

  test('staffPick is null, or { quote, by }', () => {
    expect(toBook(row).staffPick).toBeNull()
    const picked = toBook({ ...row, staff_pick_quote: 'Loved it', staff_pick_by: 'Mia' })
    expect(picked.staffPick).toEqual({ quote: 'Loved it', by: 'Mia' })
  })

  test('a book without reviews has rating null, not 0', () => {
    expect(toBook({ ...row, rating: null }).rating).toBeNull()
  })
})
