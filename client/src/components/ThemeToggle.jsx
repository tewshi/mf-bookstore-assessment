import { useState } from 'react'
import { MoonIcon, SunIcon } from './Icons'

// The sun/moon button in the header. index.html already set the starting
// theme (the dark class on <html>); this reads it and switches it.
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    // Remember the choice for next time. try: storage can be blocked.
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Then it just won't be remembered
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cursor-pointer rounded-full p-2 hover:bg-accent-soft hover:text-accent"
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
