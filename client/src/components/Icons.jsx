// Small line icons drawn as inline SVG, so we need no icon library.
// stroke="currentColor" makes each icon take the text colour around it,
// and className sets the size, e.g. <CartIcon className="size-6" />.
function Icon({ className = 'size-6', children }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CartIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" />
      <circle cx="9.5" cy="20" r="1.2" />
      <circle cx="17.5" cy="20" r="1.2" />
    </Icon>
  )
}

export function MenuIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  )
}

export function CloseIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function ChevronDownIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M6 9l6 6 6-6" />
    </Icon>
  )
}

export function SignOutIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
    </Icon>
  )
}

export function TrashIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </Icon>
  )
}

export function BookIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5zM4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3" />
    </Icon>
  )
}

export function CheckIcon({ className }) {
  return (
    <Icon className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  )
}

export function LockIcon({ className }) {
  return (
    <Icon className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Icon>
  )
}

export function SearchIcon({ className }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </Icon>
  )
}
