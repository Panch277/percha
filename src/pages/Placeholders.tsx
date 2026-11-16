import { useTranslation } from 'react-i18next'
import { IconCalendar, IconSparkle } from '../components/Icons'
import { PageHeader } from '../components/Layout'

function ComingSoon({ ns, icon }: { ns: 'outfits' | 'calendar'; icon: React.ReactNode }) {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t(`${ns}.title`)} />
      <div className="px-5 md:px-10">
        <div className="mt-6 rounded-[28px] bg-surface px-6 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-bg">{icon}</div>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed">{t(`${ns}.body`)}</p>
          <span className="mt-5 inline-block rounded-full bg-bg px-3 py-1 text-[12px] font-semibold text-accent">{t(`${ns}.stage`)}</span>
        </div>
      </div>
    </>
  )
}

export function Outfits() {
  return <ComingSoon ns="outfits" icon={<IconSparkle size={26} />} />
}

export function Calendar() {
  return <ComingSoon ns="calendar" icon={<IconCalendar size={26} />} />
}
