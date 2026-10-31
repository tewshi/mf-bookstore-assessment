import { useEffect, useRef, useState } from 'react'
import { getJson, postJson } from '../../lib/api'
import { useLive } from '../../lib/useLive'
import { BellIcon } from '../ui/Icons'

// The bell in the header, for signed-in people. The number is how many
// messages are unread; clicking opens the newest 20. The server makes
// them (server/src/lib/notifications.js) and sends 'notifications' over
// the live connection when there is a new one, so the bell updates by
// itself, on every device this person is signed in on.
export function NotificationBell() {
  // { unread, notifications } from the API, null until it answers
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  // To tell whether a click landed inside the dropdown (as in UserMenu)
  const boxRef = useRef(null)

  function load() {
    getJson('/api/notifications').then(setData, () => {})
  }

  useEffect(load, [])
  useLive('notifications', load)

  // While open, a click outside or the Escape key closes it
  useEffect(() => {
    if (!open) return
    function onClick(event) {
      if (!boxRef.current.contains(event.target)) setOpen(false)
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Mark them read on the server. Its answer is a live 'notifications'
  // message, which makes every open bell (this one too) load again.
  function markRead(notification) {
    if (!notification.read) postJson(`/api/notifications/${notification.id}/read`).catch(() => {})
    setOpen(false)
  }
  function markAllRead() {
    postJson('/api/notifications/read').catch(() => {})
  }

  const unread = data?.unread ?? 0

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications, ${unread} unread`}
        aria-expanded={open}
        aria-controls="notifications"
        className={`relative cursor-pointer rounded-full p-2 hover:bg-accent-soft hover:text-accent ${
          open ? 'bg-accent-soft text-accent' : ''
        }`}
      >
        <BellIcon />
        {/* The number on the bell, like the cart's; 9+ so it stays round */}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-on-accent">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        // fixed on phones (the header is too narrow to hang it off the
        // bell), next to the bell from sm up
        <div
          id="notifications"
          className="fixed inset-x-4 top-16 rounded-xl border border-line bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-medium">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="cursor-pointer text-sm text-accent hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {data?.notifications.length ? (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {data.notifications.map((notification) => (
                <li key={notification.id}>
                  {/* A plain link, so navigate() handles it (lib/navigate.js) */}
                  <a
                    href={notification.link ?? '/'}
                    onClick={() => markRead(notification)}
                    className="flex gap-3 px-4 py-3 text-sm hover:bg-accent-soft"
                  >
                    {/* The dot marks unread ones; read ones get an empty space */}
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        notification.read ? '' : 'bg-accent'
                      }`}
                    />
                    <span>
                      <span className={notification.read ? 'text-muted' : 'font-medium'}>
                        {notification.text}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {new Date(notification.createdAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
