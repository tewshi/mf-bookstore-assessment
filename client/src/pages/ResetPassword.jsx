import { useState } from 'react'
import { authClient } from '../lib/auth'

// The /reset-password page, where the link in the reset email ends up.
// Better Auth checks the link first, then sends the browser here with
// ?token=... (still valid) or ?error=INVALID_TOKEN (expired or used).
// The token goes back with the new password, as proof the email was ours.
export function ResetPassword() {
  // Read once from the address. The page is opened from the email, so
  // the address doesn't change while it is open.
  const [query] = useState(() => new URLSearchParams(window.location.search))
  const token = query.get('token')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await authClient.resetPassword({ newPassword: password, token })
    setBusy(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  const input =
    'mt-1 w-full rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent focus:ring-4 focus:ring-accent-soft'
  const button =
    'inline-block rounded-full bg-accent px-8 py-3 font-medium text-on-accent hover:bg-accent-dark'

  let content
  if (done) {
    // revokeSessionsOnPasswordReset signed the account out everywhere
    content = (
      <>
        <p role="status" className="mb-6 text-muted">
          Your password has been changed, and the account was signed out everywhere else. Sign in
          with the new one.
        </p>
        <a href="/signin" className={button}>
          Sign in
        </a>
      </>
    )
  } else if (!token) {
    content = (
      <>
        <p className="mb-6 text-muted">
          This link has expired or was already used. Links work once, for one hour.
        </p>
        <a href="/forgot-password" className={button}>
          Send a new link
        </a>
      </>
    )
  } else {
    content = (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm font-medium">
          New password
          <input
            className={input}
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-dark">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-2 cursor-pointer rounded-full bg-accent px-8 py-3 font-medium text-on-accent hover:bg-accent-dark disabled:opacity-50"
        >
          Change password
        </button>
      </form>
    )
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="mb-4 text-3xl font-bold">Choose a new password</h1>
        {content}
      </div>
    </section>
  )
}
