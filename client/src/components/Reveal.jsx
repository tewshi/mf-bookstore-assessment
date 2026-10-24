import { useEffect, useRef, useState } from 'react'

// Fades its children in, rising a little, the first time they scroll into
// view. IntersectionObserver is the browser telling us "this element is on
// screen now", without us checking on every scroll.
// motion-reduce: people who asked their computer for less motion just see
// the content, with no movement.
export function Reveal({ children }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          // Once is enough: stop watching
          observer.disconnect()
        }
      },
      // Start when 10% of it is visible
      { threshold: 0.1 },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
