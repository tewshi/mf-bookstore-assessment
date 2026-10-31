import { useState } from 'react'
import { authClient } from '../lib/auth'

// The /forgot-password page: ask for the email, and Better Auth emails a
// link to /reset-password (see server/src/lib/auth.js). The answer is the
// same whether or not the email has an account, so nobody can use this
// form to find out who shops here.
export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    // redirectTo: where the link in the email ends up, with ?token=...
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  const input =
    'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="mb-1 text-3xl font-bold">Forgot your password?</h1>
        {sent ? (
          <p role="status" className="mt-4 text-muted">
            If <strong className="text-ink">{email}</strong> has an account, an email with a link
            to choose a new password is on its way. The link works for one hour.
          </p>
        ) : (
          <>
            <p className="mb-6 text-muted">
              Type the email you signed up with, and we'll send you a link to choose a new one.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="text-sm font-medium">
                Email
                <input
                  className={input}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-2 cursor-pointer rounded-full bg-accent px-8 py-3 font-medium text-on-accent hover:bg-accent-dark disabled:opacity-50"
              >
                Send the link
              </button>
            </form>
          </>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          <a href="/signin" className="font-medium text-accent hover:underline">
            Back to sign in
          </a>
        </p>
      </div>
    </section>
  )
}
