import { useState } from 'react'
import { RefreshIcon } from './Icons'

// The round "Refresh" button next to a list. onRefresh fetches the list
// again and returns a promise; the arrows spin until it is done, and the
// button is off meanwhile so a second click can't start a second fetch.
export function RefreshButton({ onRefresh }) {
  const [busy, setBusy] = useState(false)

  function refresh() {
    setBusy(true)
    onRefresh().finally(() => setBusy(false))
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      className="flex w-fit shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-accent disabled:cursor-default disabled:opacity-60"
    >
      <RefreshIcon className={`size-4 ${busy ? 'animate-spin' : ''}`} />
      {busy ? 'Refreshing…' : 'Refresh'}
    </button>
  )
}
