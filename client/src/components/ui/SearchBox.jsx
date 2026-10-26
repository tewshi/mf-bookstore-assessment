import { SearchIcon } from './Icons'

// The round search box above a list, with a magnifying glass inside.
// placeholder doubles as the label screen readers read out.
export function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative flex-1">
      <span className="sr-only">{placeholder}</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-surface py-2.5 pr-4 pl-11 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
      />
    </label>
  )
}
