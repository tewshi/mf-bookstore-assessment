import { useCallback, useEffect, useRef, useState } from 'react'
import { getJson, sendJson } from './api'
import { authClient } from './auth'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { BookGrid, BookGridSkeleton } from './components/BookGrid'
import { StaffPicks } from './components/StaffPicks'
import { Events } from './components/Events'
import { BookDetails } from './components/BookDetails'
import { AuthForm } from './components/AuthForm'
import { Cart } from './components/Cart'
import { Checkout } from './components/Checkout'
import { MyBooks } from './components/MyBooks'
import { Saved } from './components/Saved'
import { Receipt } from './components/Receipt'
import { Account } from './components/Account'
import { Footer } from './components/Footer'
import { Toast } from './components/Toast'

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
  // The part of the URL after #, e.g. "#book/slow-maps" or "#events".
  // Book cards link to #book/<id>, which swaps the home page for that book.
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Books come from our API now. null until they arrive.
  const [books, setBooks] = useState(null)
  const [error, setError] = useState(null)

  // Also called after someone posts a review, to refresh the star averages
  function loadBooks() {
    getJson('/api/books').then(setBooks, setError)
  }

  useEffect(loadBooks, [])

  // The cart: how many of each book, e.g. { 'slow-maps': 2 }. It lives
  // here because the header, the book pages and #cart all need it.
  // Passing a function to useState means loadCart only runs once.
  const [cart, setCart] = useState(loadCart)

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
    showToast({ text: `Added "${book.title}" to your cart`, link: '#cart', linkText: 'View cart' })
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

  useEffect(() => {
    if (userId) getJson('/api/wishlist').then(setSavedList, () => {})
  }, [userId])

  // Signed out: nothing is saved, whatever the last person's list was
  const savedIds = userId ? savedList : []

  function toggleSaved(bookId) {
    if (!userId) {
      showToast({
        text: 'Sign in to save books',
        link: '#signin',
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
          showToast({ text: 'Saved for later', link: '#saved', linkText: 'View saved' })
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

  // Split the hash at each /, e.g. "#book/slow-maps/reviews" gives
  // page "book", param "slow-maps" and anchor "reviews".
  // "#signin/checkout" gives page "signin" and param "checkout".
  const [page, param, anchor] = hash.slice(1).split('/')
  const book = page === 'book' ? books?.find((b) => b.id === param) : null

  // After switching views, jump to the top of a book (or to its reviews),
  // or to the section the link pointed at (it did not exist yet when the
  // browser looked for it).
  useEffect(() => {
    if (book) {
      const target = anchor ? document.getElementById(anchor) : null
      if (target) {
        target.scrollIntoView()
      } else {
        window.scrollTo(0, 0)
      }
    } else if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    }
  }, [hash, book, anchor])

  // Which view goes in <main>, picked from the page part of the hash
  function renderPage() {
    if (page === 'signin' || page === 'signup') {
      // param is where to go after signing in, e.g. back to "checkout"
      return <AuthForm key={hash} mode={page} next={param} />
    }
    if (page === 'cart') {
      return <Cart books={books} cart={cart} onChangeQuantity={setQuantity} />
    }
    if (page === 'checkout') {
      // After paying: empty the cart, and reload the books for the new stock
      const onPaid = () => {
        setCart({})
        loadBooks()
      }
      return <Checkout books={books} cart={cart} onPaid={onPaid} />
    }
    if (page === 'my-books') {
      return <MyBooks />
    }
    if (page === 'order') {
      // key: a fresh Receipt when going from one order to another
      return <Receipt key={param} orderId={param} />
    }
    if (page === 'account') {
      return <Account />
    }
    if (page === 'saved') {
      return (
        <Saved
          books={books}
          signedIn={Boolean(userId)}
          savedIds={savedIds}
          onToggleSave={toggleSaved}
          onAdd={addToCart}
        />
      )
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
      <>
        <Hero />
        {error && (
          <p role="alert" className="mx-auto max-w-page px-4 py-8 text-accent">
            Could not load the books. Please try again later.
          </p>
        )}
        {!books && !error && <BookGridSkeleton />}
        {books && (
          <>
            <BookGrid
              books={books}
              onAdd={addToCart}
              savedIds={savedIds}
              onToggleSave={toggleSaved}
            />
            <StaffPicks books={books} />
          </>
        )}
        <Events />
      </>
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
