import { useTranslation } from 'react-i18next'
import { IconCalendar } from '../components/Icons'
import { PageHeader } from '../components/Layout'

export function Calendar() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('calendar.title')} />
      <div className="px-5 md:px-10">
        <div className="mt-6 rounded-[28px] bg-surface px-6 py-12 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-bg">
            <IconCalendar size={26} />
          </div>
          <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed">{t('calendar.body')}</p>
          <span className="mt-5 inline-block rounded-full bg-bg px-3 py-1 text-[12px] font-semibold text-accent">{t('calendar.stage')}</span>
        </div>
      </div>
    </>
  )
}
