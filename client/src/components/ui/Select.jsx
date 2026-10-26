import { ChevronDownIcon } from './Icons'

// The round dropdown above a list: sorting the books, filtering orders.
// options is [{ value, label }]; onChange gets the chosen value.
// label isn't shown, but screen readers read it out (sr-only).
// appearance-none hides the browser's own arrow (each browser puts it
// somewhere different); we draw a chevron instead, with room (pr-11).
export function Select({ label, value, onChange, options }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full border border-line bg-surface py-2.5 pr-11 pl-4 outline-none focus:border-accent md:w-auto"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-muted" />
    </label>
  )
}
