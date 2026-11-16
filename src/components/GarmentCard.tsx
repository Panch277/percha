import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GarmentWithImage } from '../lib/store'
import { cx } from './ui'

export function GarmentCard({ g, onClick }: { g: GarmentWithImage; onClick?: () => void }) {
  const { t } = useTranslation()
  const [loaded, setLoaded] = useState(false)
  return (
    <button type="button" onClick={onClick} className="group block w-full text-left">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-tile">
        <img
          src={g.thumbUrl}
          alt={g.description}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cx(
            'absolute inset-0 h-full w-full object-contain p-[9%] transition duration-300 group-active:scale-95',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
      <div className="px-0.5 pt-2 pb-1">
        <div className="truncate text-[13.5px] leading-tight font-bold tracking-[-0.01em] md:text-[15px]">
          {g.brand || t('common.unknownBrand')}
        </div>
        <div className="truncate text-[12.5px] leading-snug text-muted md:text-[14px]">{g.description}</div>
      </div>
    </button>
  )
}
