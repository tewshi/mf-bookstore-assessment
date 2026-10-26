// Pages have real addresses (/cart, /book/slow-maps). history.pushState()
// changes the address bar without loading the page again, so the cart and
// the signed-in state stay as they are. App listens for 'popstate' to know
// the address changed: the browser fires it for Back and Forward, and
// navigate() fires it too, because pushState() on its own doesn't.
// replace: true swaps the current history entry instead of adding one.
export function navigate(to, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState(null, '', to)
  } else {
    window.history.pushState(null, '', to)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

// App runs this for every click on the page. A click on one of our own
// <a href="/..."> links goes through navigate() instead of the browser
// fetching the page from the server again. Everything else is left alone.
export function handleLinkClick(event) {
  // Ctrl/Cmd/Shift-click (new tab or window) and right-click: the browser's job
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const link = event.target.closest('a')
  if (!link || link.target || link.hasAttribute('download')) return

  const url = new URL(link.href)
  // Another site (e.g. Stripe), or the API
  if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return
  // A section of this same page (/#events on the home page): the browser
  // scrolls there itself, and that is what # links are for
  if (url.pathname === window.location.pathname && url.hash) return

  event.preventDefault()
  const to = url.pathname + url.search + url.hash
  if (to === window.location.pathname + window.location.search + window.location.hash) {
    // Already here (e.g. the logo on the home page): just go back to the top
    window.scrollTo(0, 0)
  } else {
    navigate(to)
  }
}
