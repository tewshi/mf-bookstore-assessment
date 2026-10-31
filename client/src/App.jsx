import { useCallback, useEffect, useRef, useState } from 'react'
import { getJson, sendJson } from './lib/api'
import { authClient } from './lib/auth'
import { handleLinkClick } from './lib/navigate'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { BookDetails } from './pages/BookDetails'
import { SignIn } from './pages/SignIn'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { Paid } from './pages/Paid'
import { Orders } from './pages/Orders'
import { Wishlist } from './pages/Wishlist'
import { Receipt } from './pages/Receipt'
import { Account } from './pages/Account'
import { Admin } from './pages/admin/Admin'
import { NotFound } from './pages/NotFound'
import { Footer } from './components/layout/Footer'
import { Toast } from './components/ui/Toast'
import { useLive } from './lib/useLive'

// The browser tab's title for each page, by the first part of the path.
// It also lists which pages exist: any other address is "not found".
// The home page ("") and book pages ("book") get theirs in App.
const pageTitles = {
  signin: 'Sign in',
  signup: 'Create an account',
  cart: 'Your cart',
  checkout: 'Checkout',
  paid: 'Payment',
  orders: 'Your orders',
  order: 'Receipt',
  admin: 'Admin',
  account: 'Your account',
  wishlist: 'Your wishlist',
}

// The cart this browser saved last time, or an empty one. try/catch in
// case the saved text was changed by hand and is no longer valid JSON.
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem('cart')) ?? {}
  } catch {
    return {}
  }
}

function App() {
  // The page's address: the path picks the page ("/book/slow-maps"), the
  // hash is a section to scroll to ("#reviews", or "#events" on "/").
  const [path, setPath] = useState(window.location.pathname)
  const [hash, setHash] = useState(window.location.hash)

  // popstate: the address changed (a link went through navigate(), or
  // Back/Forward). Clicks on our own links are caught here and sent to
  // navigate() (see lib/navigate.js), so the page isn't loaded again.
  useEffect(() => {
    const onAddressChange = () => {
      setPath(window.location.pathname)
      setHash(window.location.hash)
    }
    window.addEventListener('popstate', onAddressChange)
    document.addEventListener('click', handleLinkClick)
    return () => {
      window.removeEventListener('popstate', onAddressChange)
      document.removeEventListener('click', handleLinkClick)
    }
  }, [])

  // Books come from our API now. null until they arrive.
  const [books, setBooks] = useState(null)
  const [error, setError] = useState(null)

  // Also called after someone posts a review, to refresh the star averages,
  // and by the Refresh buttons. It returns the promise so they can wait.
  function loadBooks() {
    return getJson('/api/books').then(setBooks, setError)
  }

  // Braces, not useEffect(loadBooks): an effect may only return a cleanup
  // function, and loadBooks now returns a promise
  useEffect(() => {
    loadBooks()
  }, [])
  // Live: new stock, prices or star averages, from anyone (see lib/useLive.js).
  // Every book list (grid, staff picks, book pages, cart, admin) uses these.
  useLive('books', loadBooks)

  // The cart: how many of each book, e.g. { 'slow-maps': 2 }. It lives
  // here because the header, the book pages and /cart all need it.
  // Passing a function to useState means loadCart only runs once.
  const [cart, setCart] = useState(loadCart)

  // After a paid order: empty the cart, and reload the books for the new
  // stock. useCallback keeps it the same function, so Paid doesn't
  // check the order again every time App re-renders.
  const onPaid = useCallback(() => {
    setCart({})
    getJson('/api/books').then(setBooks, setError)
  }, [])

  // Save the cart in the browser whenever it changes, so it survives a refresh
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  // The message at the bottom of the screen, or null. useCallback keeps
  // closeToast the same function, so Toast's timer isn't restarted on
  // every render of App.
  const [toast, setToast] = useState(null)
  const closeToast = useCallback(() => setToast(null), [])
  // Counts every toast shown, to give each one its own id. A ref keeps a
  // value between renders without causing a re-render when it changes.
  const toastCount = useRef(0)

  // message is { text, link?, linkText?, warning? }. A new id each time,
  // so showing the same text twice still restarts the timer.
  function showToast(message) {
    toastCount.current += 1
    setToast({ ...message, id: toastCount.current })
  }

  function addToCart(bookId) {
    const book = books.find((b) => b.id === bookId)
    const inCart = cart[bookId] ?? 0
    // Never more in the cart than on the shelf
    if (inCart >= book.stock) {
      showToast({
        text:
          book.stock === 0
            ? `"${book.title}" is sold out`
            : `Only ${book.stock} of "${book.title}" in stock`,
        warning: true,
      })
      return
    }
    setCart({ ...cart, [bookId]: inCart + 1 })
    showToast({ text: `Added "${book.title}" to your cart`, link: '/cart', linkText: 'View cart' })
  }

  // A quantity of 0 takes the book out of the cart
  function setQuantity(bookId, quantity) {
    const next = { ...cart }
    if (quantity > 0) {
      next[bookId] = quantity
    } else {
      delete next[bookId]
    }
    setCart(next)
  }

  // Who is signed in. The wishlist below belongs to them.
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // Ids of the books the signed-in person saved (the hearts), e.g.
  // ['slow-maps']. Fetched again whenever someone signs in.
  const [savedList, setSavedList] = useState([])

  function loadSaved() {
    return getJson('/api/wishlist').then(setSavedList, () => {})
  }

  useEffect(() => {
    if (userId) loadSaved()
  }, [userId])
  // Live: a heart changed, maybe in this person's other tab
  useLive('wishlist', () => {
    if (userId) loadSaved()
  })

  // Signed out: nothing is saved, whatever the last person's list was
  const savedIds = userId ? savedList : []

  // The wishlist's Refresh button: the saved ids (maybe changed in another
  // tab) and the books (for new prices and stock)
  function refreshWishlist() {
    return Promise.all([loadBooks(), loadSaved()])
  }

  function toggleSaved(bookId) {
    if (!userId) {
      showToast({
        text: 'Sign in to save books',
        link: '/signin',
        linkText: 'Sign in',
        warning: true,
      })
      return
    }
    const wasSaved = savedIds.includes(bookId)
    // Change the heart straight away, then tell the server. If the server
    // fails, put the list back the way it was.
    setSavedList(wasSaved ? savedIds.filter((id) => id !== bookId) : [bookId, ...savedIds])
    sendJson(wasSaved ? 'DELETE' : 'PUT', `/api/wishlist/${bookId}`).then(
      () => {
        if (!wasSaved) {
          showToast({ text: 'Added to your wishlist', link: '/wishlist', linkText: 'View wishlist' })
        }
      },
      () => {
        setSavedList(savedIds)
        showToast({ text: 'Could not save that. Please try again.', warning: true })
      },
    )
  }

  // Total number of books, for the badge on the cart icon
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)

  // Split the path at each /, e.g. "/book/slow-maps" gives page "book"
  // and param "slow-maps". "/signin/checkout" gives page "signin" and
  // param "checkout". The home page "/" gives page "".
  const [page, param] = path.slice(1).split('/')
  const book = page === 'book' ? books?.find((b) => b.id === param) : null
  const booksLoaded = books !== null

  // Not a page we have, or a book id that isn't in the shop. Object.hasOwn
  // rather than pageTitles[page], so "/constructor" doesn't count as a page.
  const notFound =
    (page === 'book' && booksLoaded && !book) ||
    (page !== '' && page !== 'book' && !Object.hasOwn(pageTitles, page))

  // e.g. "Your cart · MayerfeldBooks", or the book's title on a book page
  const title = notFound ? 'Page not found' : book ? book.title : pageTitles[page]
  const fullTitle = title ? `${title} · MayerfeldBooks` : 'MayerfeldBooks | Independent Bookstore'
  useEffect(() => {
    document.title = fullTitle
  }, [fullTitle])

  // After moving to another page, start at its top, or at the section the
  // hash names (e.g. a book's #reviews). It runs again once the books
  // arrive, because the book page and the home page's #books section
  // aren't there until then.
  useEffect(() => {
    const target = hash ? document.getElementById(hash.slice(1)) : null
    if (target) {
      target.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [path, hash, booksLoaded])

  // Which view goes in <main>, picked from the first part of the path
  function renderPage() {
    if (notFound) {
      return <NotFound />
    }
    if (page === 'signin' || page === 'signup') {
      // param is where to go after signing in, e.g. back to "checkout"
      return <SignIn key={path} mode={page} next={param} />
    }
    if (page === 'cart') {
      return <Cart books={books} cart={cart} onChangeQuantity={setQuantity} />
    }
    if (page === 'checkout') {
      // /checkout/12: reuse unpaid order 12 if the cart still matches it
      return <Checkout books={books} cart={cart} orderId={param} />
    }
    if (page === 'paid') {
      // Where Stripe sends people back after paying, e.g. /paid/12
      return <Paid key={param} orderId={param} onPaid={onPaid} />
    }
    if (page === 'orders') {
      return <Orders />
    }
    if (page === 'order') {
      // key: a fresh Receipt when going from one order to another
      return <Receipt key={param} orderId={param} />
    }
    if (page === 'admin') {
      return <Admin tab={param} books={books} onBooksChanged={loadBooks} />
    }
    if (page === 'account') {
      return <Account />
    }
    if (page === 'wishlist') {
      return (
        <Wishlist
          books={books}
          signedIn={Boolean(userId)}
          savedIds={savedIds}
          onToggleSave={toggleSaved}
          onAdd={addToCart}
          onRefresh={refreshWishlist}
        />
      )
    }
    // A book page before the books arrive: wait before deciding it exists.
    // (If they can't load at all, the home page below shows the error.)
    if (page === 'book' && !booksLoaded && !error) {
      return <p className="mx-auto max-w-page px-4 py-16 text-muted">Loading…</p>
    }
    if (book) {
      return (
        <BookDetails
          book={book}
          books={books}
          quantity={cart[book.id] ?? 0}
          onAdd={() => addToCart(book.id)}
          onReviewed={loadBooks}
          saved={savedIds.includes(book.id)}
          onToggleSave={() => toggleSaved(book.id)}
        />
      )
    }
    return (
      <Home
        books={books}
        error={error}
        savedIds={savedIds}
        onAdd={addToCart}
        onToggleSave={toggleSaved}
      />
    )
  }

  return (
    // Sticky footer: page is at least screen height, main grows to fill it
    <div className="flex min-h-screen flex-col">
      <Header cartCount={cartCount} page={page} />
      <main id="top" className="flex-1">
        {renderPage()}
      </main>
      <Footer />
      {/* key: a new toast replaces the old one and starts its own timer */}
      {toast && <Toast key={toast.id} toast={toast} onClose={closeToast} />}
    </div>
  )
}

export default App
