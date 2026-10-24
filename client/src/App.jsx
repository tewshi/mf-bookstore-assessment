import { useEffect, useState } from 'react'
import { getJson } from './api'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { BookGrid } from './components/BookGrid'
import { StaffPicks } from './components/StaffPicks'
import { Events } from './components/Events'
import { BookDetails } from './components/BookDetails'
import { AuthForm } from './components/AuthForm'
import { Cart } from './components/Cart'
import { Checkout } from './components/Checkout'
import { MyBooks } from './components/MyBooks'
import { Footer } from './components/Footer'

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

  function addToCart(bookId) {
    setCart({ ...cart, [bookId]: (cart[bookId] ?? 0) + 1 })
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
      return <Checkout books={books} cart={cart} onPaid={() => setCart({})} />
    }
    if (page === 'my-books') {
      return <MyBooks />
    }
    if (book) {
      return (
        <BookDetails
          book={book}
          quantity={cart[book.id] ?? 0}
          onAdd={() => addToCart(book.id)}
          onReviewed={loadBooks}
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
        {books && (
          <>
            <BookGrid books={books} onAdd={addToCart} />
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
    </div>
  )
}

export default App
