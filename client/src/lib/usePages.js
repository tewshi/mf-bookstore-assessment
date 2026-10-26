import { useState } from 'react'

// Splits a list we already have in full (orders, events, staff picks)
// into pages of perPage. The book grid doesn't need this: the server
// sends it one page at a time.
// Returns this page's items, the page number, and setPage to switch.
// If the list gets shorter (a filter, a delete), page stays inside it,
// e.g. page 3 of a list that now has 2 pages shows page 2.
export function usePages(items, perPage) {
  const [wanted, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / perPage))
  const page = Math.min(wanted, pageCount)
  const start = (page - 1) * perPage
  return { page, setPage, pageItems: items.slice(start, start + perPage) }
}
