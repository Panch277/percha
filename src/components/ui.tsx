import { type ButtonHTMLAttributes, type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BRAND } from '../config/brand'
import { IconHanger, IconX } from './Icons'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'lg' | 'sm'
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none',
        size === 'lg' && 'h-13 px-7 text-[15px]',
        size === 'md' && 'h-11 px-5 text-[14px]',
        size === 'sm' && 'h-9 px-4 text-[13px]',
        variant === 'primary' && 'bg-ink text-on-ink',
        variant === 'secondary' && 'bg-surface text-ink',
        variant === 'ghost' && 'text-ink hover:bg-surface',
        variant === 'danger' && 'bg-surface text-danger',
        className,
      )}
      {...rest}
    />
  )
}

export function Chip({
  active,
  children,
  onClick,
  swatch,
}: {
  active?: boolean
  children: ReactNode
  onClick?: () => void
  swatch?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition active:scale-95',
        active ? 'bg-ink text-on-ink' : 'bg-surface text-ink',
      )}
    >
      {swatch && <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: swatch }} />}
      {children}
    </button>
  )
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-full bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 rounded-full text-[13px] font-medium transition',
            value === o.value ? 'bg-bg text-ink shadow-sm' : 'text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-wide text-muted">
        {label}
        {hint}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-ink placeholder:text-muted outline-none focus:ring-2 focus:ring-ink/80'

/** Panel inferior en móvil, diálogo centrado en escritorio */
export function Sheet({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-bg md:max-w-lg md:rounded-[28px]">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-[17px] font-semibold">{title}</div>
          <button onClick={onClose} className="-mr-2 grid h-10 w-10 place-items-center rounded-full hover:bg-surface" aria-label="close">
            <IconX size={20} />
          </button>
        </div>
        <div className="pb-safe overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[22px] font-extrabold tracking-[-0.04em]', className)}>
      <IconHanger size={24} strokeWidth={2.1} />
      {BRAND.name}
      <span className="mb-3 h-1.5 w-1.5 rounded-full bg-accent" />
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />
}

export function ProgressBar({ value }: { value: number | null }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
      <div
        className={cx('h-full rounded-full bg-ink transition-[width]', value === null && 'w-1/3 animate-pulse')}
        style={value !== null ? { width: `${Math.round(value * 100)}%` } : undefined}
      />
    </div>
  )
}
