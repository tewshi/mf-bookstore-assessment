import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Runs before every test file (see test in vite.config.js).

// Take whatever a test rendered off the page, so the next test starts empty
afterEach(() => cleanup())

// jsdom is a browser made of JavaScript, but some parts are missing. These
// stand-ins do nothing, which is enough for components that use them.

// Reveal fades sections in when they scroll into view
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// lib/useLive.js opens one of these for live updates. No server here, so
// it never receives anything.
globalThis.EventSource = class {
  static CLOSED = 2
  readyState = 0
  close() {}
}

// jsdom can't scroll; it only complains when asked to
window.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()
