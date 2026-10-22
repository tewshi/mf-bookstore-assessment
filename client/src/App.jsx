import { useEffect, useState } from 'react'
import { books } from './data/books'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { BookGrid } from './components/BookGrid'
import { StaffPicks } from './components/StaffPicks'
import { Events } from './components/Events'
import { BookDetails } from './components/BookDetails'
import { Footer } from './components/Footer'

function App() {
  // The part of the URL after #, e.g. "#book/slow-maps" or "#events".
  // Book cards link to #book/<id>, which swaps the home page for that book.
  const [hash, setHash] = useState(window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const bookId = hash.startsWith('#book/') ? hash.slice('#book/'.length) : null
  const book = books.find((b) => b.id === bookId)

  // After switching views, jump to the top of a book, or to the section
  // the link pointed at (it did not exist yet when the browser looked for it).
  useEffect(() => {
    if (book) {
      window.scrollTo(0, 0)
    } else if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    }
  }, [hash, book])

  return (
    // Sticky footer: page is at least screen height, main grows to fill it
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="top" className="flex-1">
        {book ? (
          <BookDetails book={book} />
        ) : (
          <>
            <Hero />
            <BookGrid />
            <StaffPicks />
            <Events />
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
