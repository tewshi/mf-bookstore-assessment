import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { BookGrid } from './components/BookGrid'
import { Footer } from './components/Footer'

function App() {
  return (
    // Sticky footer: page is at least screen height, main grows to fill it
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="top" className="flex-1">
        <Hero />
        <BookGrid />
      </main>
      <Footer />
    </div>
  )
}

export default App
