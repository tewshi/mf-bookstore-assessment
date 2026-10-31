import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { cartItems, cartTotal } from '../src/lib/cart'
import { getJson, sendJson } from '../src/lib/api'
import { handleLinkClick, navigate } from '../src/lib/navigate'

// Unit tests for the plain JavaScript in src/lib

describe('cart', () => {
  const books = [
    { id: 'slow-maps', price: 14 },
    { id: 'borrowed-summers', price: 12.5 },
    { id: 'bread-and-salt', price: 22 },
  ]

  test('cartItems keeps only the books in the cart, with their quantity', () => {
    const items = cartItems(books, { 'slow-maps': 2, 'bread-and-salt': 1 })
    expect(items.map((item) => [item.book.id, item.quantity])).toEqual([
      ['slow-maps', 2],
      ['bread-and-salt', 1],
    ])
  })

  test('cartTotal adds price × quantity', () => {
    expect(cartTotal(cartItems(books, { 'slow-maps': 2, 'borrowed-summers': 1 }))).toBe(40.5)
  })

  test('an empty cart costs nothing', () => {
    expect(cartTotal(cartItems(books, {}))).toBe(0)
  })
})

describe('api', () => {
  // fetch is swapped for a fake that answers what each test says
  const answer = (status, body) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: status < 400, status, json: async () => body })),
    )

  afterEach(() => vi.unstubAllGlobals())

  test('getJson returns the parsed answer', async () => {
    answer(200, [{ id: 'slow-maps' }])
    expect(await getJson('/api/books')).toEqual([{ id: 'slow-maps' }])
  })

  test('getJson throws when the server says no', async () => {
    answer(500, {})
    await expect(getJson('/api/books')).rejects.toThrow('/api/books answered 500')
  })

  test("sendJson throws the server's own message", async () => {
    answer(409, { error: 'Sorry, this event is fully booked' })
    await expect(sendJson('POST', '/api/events/x/signup')).rejects.toThrow(
      'Sorry, this event is fully booked',
    )
  })

  test('sendJson sends the body as JSON', async () => {
    answer(200, { ok: true })
    await sendJson('PUT', '/api/wishlist/slow-maps', { a: 1 })
    const [path, options] = fetch.mock.calls[0]
    expect(path).toBe('/api/wishlist/slow-maps')
    expect(options.method).toBe('PUT')
    expect(options.body).toBe('{"a":1}')
  })
})

describe('navigate', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'))

  test('changes the address and tells App (popstate)', () => {
    const heard = vi.fn()
    window.addEventListener('popstate', heard)
    navigate('/cart')
    window.removeEventListener('popstate', heard)
    expect(window.location.pathname).toBe('/cart')
    expect(heard).toHaveBeenCalledOnce()
  })

  // A click event on a link, as App's document listener would see it
  function clickOn(href, extra = {}) {
    const link = document.createElement('a')
    link.href = href
    document.body.append(link)
    const event = { button: 0, target: link, preventDefault: vi.fn(), ...extra }
    handleLinkClick(event)
    link.remove()
    return event
  }

  test('our own links go through navigate, without loading the page again', () => {
    const event = clickOn('/orders')
    expect(event.preventDefault).toHaveBeenCalled()
    expect(window.location.pathname).toBe('/orders')
  })

  test.each([
    ['another site', 'https://checkout.stripe.com/pay', {}],
    ['the API', '/api/books', {}],
    ['a section of this page', '/#events', {}],
    ['Cmd-click (new tab)', '/orders', { metaKey: true }],
  ])('leaves %s to the browser', (_, href, extra) => {
    const event = clickOn(href, extra)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(window.location.pathname).toBe('/')
  })
})
