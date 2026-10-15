// Controlled component: it has no state of its own. The parent passes
// the current value in and gets told about changes through onChange.
export function StarRating({ value, onChange, label, max = 5 }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)

  return (
    // relative z-10 lifts the stars above the card's stretched link
    <div className="relative z-10 mt-2 flex" role="group" aria-label={`Your rating for ${label}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          // Clicking the current rating again clears it back to 0
          onClick={() => onChange(star === value ? 0 : star)}
          aria-label={`${star} of ${max} stars`}
          aria-pressed={star <= value}
          className={`cursor-pointer px-0.5 text-xl leading-none hover:scale-110 ${
            star <= value ? 'text-accent' : 'text-line'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
