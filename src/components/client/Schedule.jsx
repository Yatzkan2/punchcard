import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { getSlotsByWeek } from '../../lib/slots'
import WeekNav from '../shared/WeekNav'
import Spinner from '../shared/Spinner'

function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function localDateKey(isoString) {
  const d = new Date(isoString)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupByDay(slots) {
  const map = new Map()
  for (const slot of slots) {
    const key = localDateKey(slot.starts_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(slot)
  }
  return map
}

function SlotRow({ slot, clientId, locale, t }) {
  const now        = new Date()
  const startsAt   = new Date(slot.starts_at)
  const isPast     = startsAt < now
  const isRegistered = slot.slot_registrations?.some(r => r.clients?.id === clientId)
  const spotsLeft  = slot.capacity - (slot.slot_registrations?.length ?? 0)
  const isFull     = spotsLeft <= 0

  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(startsAt)

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isPast ? 'opacity-40' : ''}`}>
      {/* Time */}
      <span className="text-sm font-mono text-gray-500 w-11 shrink-0">{time}</span>

      {/* Product + spots */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isPast ? 'text-gray-400' : 'text-gray-800'}`}>
          {slot.products?.name ?? '—'}
        </p>
        {slot.notes && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{slot.notes}</p>
        )}
      </div>

      {/* Badge / spots */}
      <div className="shrink-0">
        {isRegistered ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
            {t('schedule.you_are_in')}
          </span>
        ) : isFull ? (
          <span className="text-xs text-red-400 font-medium">{t('schedule.full')}</span>
        ) : (
          <span className={`text-xs tabular-nums ${spotsLeft <= 3 ? 'text-amber-500 font-medium' : 'text-gray-400'}`}>
            {t('schedule.spots_left', { count: spotsLeft })}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Schedule({ clientId }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'he' ? 'he-IL' : 'en-GB'

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [slots,     setSlots]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSlots(await getSlotsByWeek(weekStart))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => { load() }, [load])

  function prevWeek() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  }
  function nextWeek() {
    setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  }

  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' })
  const grouped = groupByDay(slots)

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex justify-center">
        <WeekNav startDate={weekStart} onPrev={prevWeek} onNext={nextWeek} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="w-5 h-5 text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : grouped.size === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">{t('schedule.no_classes')}</p>
      ) : (
        [...grouped.entries()].map(([dayKey, daySlots]) => (
          <div key={dayKey} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {dayFmt.format(new Date(dayKey + 'T00:00:00'))}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {daySlots.map(slot => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  clientId={clientId}
                  locale={locale}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
