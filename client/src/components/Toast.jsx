import { useEffect } from 'react'
import { CheckIcon } from './Icons'

// A short message that pops up at the bottom of the screen, e.g. "Added
// to your cart", and goes away by itself after 3 seconds. toast is
// { text, link?, linkText? }; onClose removes it.
export function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    // If the toast goes away earlier (or is replaced), cancel the timer
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    // The outer div only centres the toast; pointer-events-none lets clicks
    // go through the empty space around it to the page underneath.
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pointer-events-auto flex animate-toast-in items-center gap-3 rounded-full bg-ink py-3 pr-3 pl-4 text-sm text-bg shadow-xl"
      >
        <CheckIcon className="size-5 shrink-0 text-emerald-400" />
        <span>{toast.text}</span>
        {toast.link && (
          <a
            href={toast.link}
            onClick={onClose}
            className="rounded-full bg-bg/15 px-3 py-1 font-medium whitespace-nowrap hover:bg-bg/25"
          >
            {toast.linkText}
          </a>
        )}
      </div>
    </div>
  )
}
