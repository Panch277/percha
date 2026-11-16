import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { IconCalendar, IconHanger, IconSparkle, IconUser } from './Icons'
import { cx, Wordmark } from './ui'

const NAV = [
  { to: '/', key: 'closet', Icon: IconHanger, end: true },
  { to: '/outfits', key: 'outfits', Icon: IconSparkle },
  { to: '/calendar', key: 'calendar', Icon: IconCalendar },
  { to: '/profile', key: 'profile', Icon: IconUser },
] as const

export function Layout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-dvh md:flex">
      {/* Lateral (escritorio) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line px-4 py-6 md:flex">
        <Wordmark className="px-3" />
        <nav className="mt-10 space-y-1">
          {NAV.map(({ to, key, Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest}
              className={({ isActive }) =>
                cx(
                  'flex h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium transition',
                  isActive ? 'bg-ink text-on-ink' : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              <Icon size={20} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 pb-28 md:pb-10">
        <Outlet />
      </main>

      {/* Inferior (móvil) */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md">
          {NAV.map(({ to, key, Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest}
              className={({ isActive }) =>
                cx('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium', isActive ? 'text-ink' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={23} strokeWidth={isActive ? 2.1 : 1.7} />
                  {t(`nav.${key}`)}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

export function PageHeader({ title, right, sub }: { title: string; right?: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header className="pt-safe px-5 md:px-10">
      <div className="flex items-end justify-between pt-6 pb-1 md:pt-10">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.035em] md:text-[36px]">{title}</h1>
          {sub && <p className="mt-0.5 text-[14px] text-muted">{sub}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}
