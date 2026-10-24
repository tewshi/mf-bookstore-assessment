import { useEffect, useState } from 'react'
import { authClient } from '../auth'
import { getJson, postJson } from '../api'
import { StarRating, Stars } from './StarRating'

// The reviews under a book. People who bought the book also get a form
// to write one (or to change the one they wrote).
// onReviewed tells App, so the star averages on the cards update too.
export function Reviews({ book, onReviewed }) {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // { canReview, reviews } from the API, null until it answers
  const [data, setData] = useState(null)

  function load() {
    getJson(`/api/books/${book.id}/reviews`).then(setData, () =>
      setData({ canReview: false, reviews: [] }),
    )
  }

  // Load again when someone signs in or out: canReview depends on who asks
  useEffect(load, [book.id, userId])

  // The section is there even while loading, so a #book/<id>/reviews
  // link has something to scroll to straight away
  const section = 'mt-16 scroll-mt-20 border-t border-line pt-12'
  if (!data) {
    return (
      <section id="reviews" className={section}>
        <h2 className="text-3xl font-bold">Reviews</h2>
        <p className="mt-4 text-muted">Loading reviews…</p>
      </section>
    )
  }

  const { reviews, canReview } = data
  const mine = reviews.find((review) => review.mine)
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length

  return (
    <section id="reviews" className={section}>
      <div className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-3xl font-bold">Reviews</h2>
        {reviews.length > 0 && (
          <p className="flex items-center gap-2 text-muted">
            <Stars rating={average} className="text-lg" />
            {average.toFixed(1)} &middot; {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        )}
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
        <div>
          {reviews.length === 0 && <p className="text-muted">No reviews yet.</p>}
          <ul className="flex flex-col gap-4">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-2xl border border-line bg-surface p-6">
                <div className="mb-3 flex items-center gap-3">
                  {/* The first letter of their name in a circle */}
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">
                    {review.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium">
                      {review.name}
                      {review.mine && (
                        <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(review.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Stars rating={review.rating} className="ml-auto" />
                </div>
                {/* whitespace-pre-line keeps the line breaks people typed */}
                <p className="whitespace-pre-line">{review.text}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Who may write: buyers get the form, everyone else a short note */}
        {canReview ? (
          <ReviewForm
            book={book}
            mine={mine}
            onSaved={() => {
              load()
              onReviewed()
            }}
          />
        ) : (
          <p className="rounded-2xl bg-accent-soft p-6 text-sm text-accent-dark">
            {session ? (
              'Bought this book? Reviews are open to people who bought it here.'
            ) : (
              <>
                Reviews are written by people who bought the book.{' '}
                <a href="#signin" className="font-medium underline">
                  Sign in
                </a>{' '}
                to write yours.
              </>
            )}
          </p>
        )}
      </div>
    </section>
  )
}

// Stars and a text box. mine is the person's earlier review, if any,
// so the form starts filled in and saving replaces it.
function ReviewForm({ book, mine, onSaved }) {
  const [rating, setRating] = useState(mine?.rating ?? 0)
  const [text, setText] = useState(mine?.text ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    if (rating === 0) {
      setError('Pick a rating from 1 to 5 stars')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await postJson(`/api/books/${book.id}/reviews`, { rating, text })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6 lg:sticky lg:top-24"
    >
      <h3 className="text-xl font-bold">{mine ? 'Edit your review' : 'Write a review'}</h3>
      <div>
        <p className="text-sm font-medium">Your rating</p>
        {/* The same controlled StarRating the book cards used in Week 2 */}
        <StarRating label={book.title} value={rating} onChange={setRating} />
      </div>
      <label className="text-sm font-medium">
        Your review
        <textarea
          className="mt-1 min-h-32 w-full rounded-xl border border-line bg-bg px-4 py-3 font-normal outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you think?"
          required
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Thanks! Your review is up.
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="cursor-pointer rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {mine ? 'Update review' : 'Post review'}
      </button>
    </form>
  )
}
