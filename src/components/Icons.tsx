import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Base({ size = 22, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconHanger = (p: P) => (
  <Base {...p}>
    <path d="M12 7.2a2.2 2.2 0 1 1 2.2-2.2c0 .9-.6 1.5-1.4 1.9-.5.3-.8.7-.8 1.2v.9l8.3 5.6a1.4 1.4 0 0 1-.8 2.6H4.5a1.4 1.4 0 0 1-.8-2.6L12 9" />
  </Base>
)
export const IconSparkle = (p: P) => (
  <Base {...p}>
    <path d="M12 3.5l1.8 4.9 4.9 1.8-4.9 1.8L12 16.9l-1.8-4.9-4.9-1.8 4.9-1.8z" />
    <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Base>
)
export const IconCalendar = (p: P) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </Base>
)
export const IconUser = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c1.3-3.6 4.2-5.5 7.5-5.5s6.2 1.9 7.5 5.5" />
  </Base>
)
export const IconPlus = (p: P) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)
export const IconSearch = (p: P) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </Base>
)
export const IconX = (p: P) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
)
export const IconCheck = (p: P) => (
  <Base {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Base>
)
export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 0 0 1.5 1.3h6.2a1.5 1.5 0 0 0 1.5-1.3L17.5 7" />
  </Base>
)
export const IconChevron = (p: P) => (
  <Base {...p}>
    <path d="M9 5l7 7-7 7" />
  </Base>
)
export const IconBack = (p: P) => (
  <Base {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
)
export const IconSliders = (p: P) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Base>
)
export const IconImage = (p: P) => (
  <Base {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M20.5 16l-5-5-8.5 8.5" />
  </Base>
)
export const IconAlert = (p: P) => (
  <Base {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Base>
)
export const IconThumbUp = (p: P) => (
  <Base {...p}>
    <path d="M7.5 10.5v9H4.8a1.3 1.3 0 0 1-1.3-1.3v-6.4a1.3 1.3 0 0 1 1.3-1.3zM7.5 10.5l3.6-6.4a1.9 1.9 0 0 1 3.5 1.3l-.7 3.6h4.7a2 2 0 0 1 2 2.4l-1.3 6.6a2 2 0 0 1-2 1.5H7.5" />
  </Base>
)
export const IconThumbDown = (p: P) => (
  <Base {...p}>
    <path d="M16.5 13.5v-9h2.7a1.3 1.3 0 0 1 1.3 1.3v6.4a1.3 1.3 0 0 1-1.3 1.3zM16.5 13.5l-3.6 6.4a1.9 1.9 0 0 1-3.5-1.3l.7-3.6H5.4a2 2 0 0 1-2-2.4l1.3-6.6a2 2 0 0 1 2-1.5h9.8" />
  </Base>
)
export const IconBookmark = (p: P) => (
  <Base {...p}>
    <path d="M6.5 4.5h11v16l-5.5-4-5.5 4z" />
  </Base>
)
export const IconPencil = (p: P) => (
  <Base {...p}>
    <path d="M14.5 5.5l4 4M4.5 19.5l1-4.5L16 4.5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L9 18.5z" />
  </Base>
)
export const IconShuffle = (p: P) => (
  <Base {...p}>
    <path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.7 0 2.7-1.4 3.4-3M20 7h-3.5c-1.7 0-2.7 1.4-3.4 3M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" />
  </Base>
)
export const IconSun = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Base>
)
export const IconCloud = (p: P) => (
  <Base {...p}>
    <path d="M7 18.5h10a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.2A3.4 3.4 0 0 0 7 18.5z" />
  </Base>
)
export const IconRain = (p: P) => (
  <Base {...p}>
    <path d="M7 15h10a3.8 3.8 0 0 0 .6-7.5 5.3 5.3 0 0 0-10.2 1.1A3.2 3.2 0 0 0 7 15zM8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" />
  </Base>
)
export const IconSnow = (p: P) => (
  <Base {...p}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
  </Base>
)
export const IconStorm = (p: P) => (
  <Base {...p}>
    <path d="M7 15h10a3.8 3.8 0 0 0 .6-7.5 5.3 5.3 0 0 0-10.2 1.1A3.2 3.2 0 0 0 7 15zM12.5 15l-2 3.5h3l-2 3" />
  </Base>
)
export const IconPin = (p: P) => (
  <Base {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Base>
)
