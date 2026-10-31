import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Smoke tests: the whole App, opened on each main address, shows the
// right page without crashing. No server: fetch is a fake that answers
// like our API would, and nobody is signed in.

// Better Auth's client asks the server who is signed in; here: nobody
vi.mock('../src/lib/auth', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signOut: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
  },
}))

const { default: App } = await import('../src/App')

// Two books, with every field the pages use
const book = (id, title, extra = {}) => ({
  id,
  title,
  author: 'Ada Example',
  section: 'Fiction',
  isbn: `isbn-${id}`,
  price: 14,
  image: `/books/${id}.jpg`,
  description: `About ${title}.`,
  format: 'Paperback',
  pages: 320,
  published: 2024,
  stock: 5,
  staffPick: null,
  rating: null,
  reviewCount: 0,
  ...extra,
})
const books = [
  book('slow-maps', 'Slow Maps', { staffPick: { quote: 'Loved it', by: 'Mia' } }),
  book('bread-and-salt', 'Bread and Salt'),
]

// What the fake API answers, by address
function fakeApi(path) {
  if (path === '/api/books') return books
  // The book grid asks for one page at a time
  if (path.startsWith('/api/books?')) {
    return { books, total: books.length, page: 1, perPage: 12, pageCount: 1 }
  }
  if (path.endsWith('/recommendations')) return []
  if (path.endsWith('/reviews')) return { canReview: false, reviews: [] }
  if (path === '/api/events') return []
  return {}
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (path) => ({ ok: true, status: 200, json: async () => fakeApi(path) })),
  )
  localStorage.clear()
})

afterEach(() => vi.unstubAllGlobals())

// Open the app at this address, like typing it into the browser
function openAt(path) {
  window.history.replaceState(null, '', path)
  render(<App />)
}

// findBy... waits (up to a second) for something to appear, e.g. after
// the fake books arrive
const heading = (name) => screen.findByRole('heading', { level: 1, name })

describe('smoke: every main page opens', () => {
  test('home page: hero, the books, and the tab title', async () => {
    openAt('/')
    await heading(/Books chosen by people who/)
    // Staff picks and the grid both show it, so there are several
    expect((await screen.findAllByText('Slow Maps')).length).toBeGreaterThan(0)
    expect(document.title).toBe('MayerfeldBooks | Independent Bookstore')
  })

  test('a book page', async () => {
    openAt('/book/bread-and-salt')
    await heading('Bread and Salt')
    expect(document.title).toBe('Bread and Salt · MayerfeldBooks')
  })

  test('a book that does not exist shows Page not found', async () => {
    openAt('/book/no-such-book')
    await heading('Page not found')
  })

  test('an unknown address shows Page not found', async () => {
    openAt('/nope')
    await heading('Page not found')
    expect(document.title).toBe('Page not found · MayerfeldBooks')
  })

  test('the empty cart', async () => {
    openAt('/cart')
    await heading('Your cart is empty')
  })

  test('the cart remembers what was added (localStorage)', async () => {
    localStorage.setItem('cart', JSON.stringify({ 'slow-maps': 2 }))
    openAt('/cart')
    await heading('Your cart')
    await screen.findByText('Slow Maps')
  })

  test.each([
    ['/signin', 'Welcome back'],
    ['/signup', 'Create an account'],
    ['/forgot-password', 'Forgot your password?'],
    ['/reset-password?error=INVALID_TOKEN', 'Choose a new password'],
  ])('%s', async (path, title) => {
    openAt(path)
    await heading(title)
  })

  test.each([
    ['/orders', 'Sign in to see your orders'],
    ['/wishlist', 'Sign in to see your wishlist'],
    ['/admin', 'Staff only'],
  ])('%s asks a signed-out visitor to sign in', async (path, title) => {
    openAt(path)
    await heading(title)
  })
})
