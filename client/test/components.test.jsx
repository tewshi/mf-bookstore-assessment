import { describe, expect, test, vi } from 'vitest'
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { usePages } from '../src/lib/usePages'
import { Pagination } from '../src/components/ui/Pagination'
import { RefreshButton } from '../src/components/ui/RefreshButton'

// Unit tests for components and hooks: each one rendered on its own.
// screen.getByText / getByRole throw when nothing matches, so finding an
// element is already a check that it is there.

describe('usePages', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  test('starts on page 1 with the first perPage items', () => {
    const { result } = renderHook(() => usePages(items, 10))
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  })

  test('the last page holds what is left', () => {
    const { result } = renderHook(() => usePages(items, 10))
    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25])
  })

  test('stays inside the list when it gets shorter', () => {
    const { result, rerender } = renderHook(({ list }) => usePages(list, 10), {
      initialProps: { list: items },
    })
    act(() => result.current.setPage(3))
    // e.g. a filter leaves 12 items: 2 pages, so page 3 becomes page 2
    rerender({ list: items.slice(0, 12) })
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual([11, 12])
  })
})

describe('Pagination', () => {
  test('shows nothing when everything fits on one page', () => {
    const { container } = render(
      <Pagination page={1} perPage={10} total={8} noun="books" onChange={() => {}} />,
    )
    expect(container.innerHTML).toBe('')
  })

  test('says what is shown and switches page', () => {
    const onChange = vi.fn()
    render(<Pagination page={2} perPage={10} total={25} noun="books" onChange={onChange} />)
    screen.getByText('Showing 11–20 of 25 books')
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
    expect(onChange).toHaveBeenCalledWith(3)
    fireEvent.click(screen.getByRole('button', { name: 'Page 1' }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  test('Previous is off on the first page, Next on the last', () => {
    const { rerender } = render(
      <Pagination page={1} perPage={10} total={25} noun="books" onChange={() => {}} />,
    )
    expect(screen.getByRole('button', { name: '← Previous' }).disabled).toBe(true)
    rerender(<Pagination page={3} perPage={10} total={25} noun="books" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Next →' }).disabled).toBe(true)
  })
})

describe('RefreshButton', () => {
  test('is off and says Refreshing… until the reload is done', async () => {
    // A promise the test finishes itself, when it wants to
    let finish
    const onRefresh = vi.fn(() => new Promise((resolve) => (finish = resolve)))
    render(<RefreshButton onRefresh={onRefresh} />)

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    const busy = screen.getByRole('button', { name: 'Refreshing…' })
    expect(busy.disabled).toBe(true)
    // A second click while busy doesn't start a second reload
    fireEvent.click(busy)
    expect(onRefresh).toHaveBeenCalledOnce()

    await act(async () => finish())
    expect(screen.getByRole('button', { name: 'Refresh' }).disabled).toBe(false)
  })
})
