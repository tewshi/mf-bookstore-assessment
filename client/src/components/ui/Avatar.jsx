// The person's picture, or our default one. Better Auth keeps it in the
// user's `image` field; it's empty until they upload one on /account.
export function Avatar({ user, className = 'size-8' }) {
  return (
    <img
      src={user.image || '/avatar.svg'}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover ring-2 ring-accent-soft`}
    />
  )
}
